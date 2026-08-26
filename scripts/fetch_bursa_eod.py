"""Fetch Bursa Malaysia EOD prices and upsert them into Supabase.

The job deliberately fetches several calendar days so it can calculate the
one-session percentage change across weekends and market holidays.
"""

from __future__ import annotations

import logging
import math
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from typing import Any, Iterable

import pandas as pd
import yfinance as yf
from supabase import Client, create_client

LOGGER = logging.getLogger("bursa-eod")
BATCH_SIZE = int(os.getenv("YFINANCE_BATCH_SIZE", "40"))
UPSERT_SIZE = 500
MAX_ATTEMPTS = 3


def chunks(items: list[str], size: int) -> Iterable[list[str]]:
    for index in range(0, len(items), size):
        yield items[index : index + size]


def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value


def fetch_all_ordinary_tickers(supabase: Client) -> list[str]:
    tickers: list[str] = []
    page_size = 1_000
    start = 0
    while True:
        response = (
            supabase.table("bursa_master")
            .select("ticker")
            .eq("is_ordinary", True)
            .order("ticker")
            .range(start, start + page_size - 1)
            .execute()
        )
        page = [str(row["ticker"]) for row in response.data]
        tickers.extend(page)
        if len(page) < page_size:
            break
        start += page_size
    return tickers


def finite_number(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def extract_history(download: pd.DataFrame, symbol: str, symbol_count: int) -> pd.DataFrame:
    if download.empty:
        return pd.DataFrame()
    if symbol_count == 1:
        return download
    try:
        frame = download[symbol]
    except KeyError:
        return pd.DataFrame()
    return frame.dropna(how="all")


def latest_market_cap(symbol: str) -> int | None:
    try:
        value = yf.Ticker(symbol).fast_info.get("market_cap")
        number = finite_number(value)
        return int(number) if number is not None and number >= 0 else None
    except Exception as exc:  # yfinance providers occasionally omit fast_info.
        LOGGER.warning("Market cap unavailable for %s: %s", symbol, exc)
        return None


def fetch_batch(tickers: list[str]) -> list[dict[str, Any]]:
    symbols = [f"{ticker}.KL" for ticker in tickers]
    download: pd.DataFrame | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            download = yf.download(
                tickers=symbols,
                period="5d",
                interval="1d",
                group_by="ticker",
                auto_adjust=False,
                actions=False,
                threads=True,
                progress=False,
                timeout=25,
            )
            break
        except Exception as exc:
            if attempt == MAX_ATTEMPTS:
                LOGGER.error("Batch failed after %s attempts: %s", MAX_ATTEMPTS, exc)
                return []
            time.sleep(2**attempt)

    if download is None or download.empty:
        return []

    market_caps: dict[str, int | None] = {}
    with ThreadPoolExecutor(max_workers=min(8, len(symbols))) as executor:
        futures = {executor.submit(latest_market_cap, symbol): symbol for symbol in symbols}
        for future in as_completed(futures):
            market_caps[futures[future]] = future.result()

    records: list[dict[str, Any]] = []
    for ticker, symbol in zip(tickers, symbols, strict=True):
        history = extract_history(download, symbol, len(symbols))
        if history.empty or "Close" not in history:
            LOGGER.warning("No price history returned for %s", symbol)
            continue
        history = history.dropna(subset=["Close"])
        if history.empty:
            continue

        latest = history.iloc[-1]
        close = finite_number(latest.get("Close"))
        if close is None:
            continue
        previous_close = finite_number(history.iloc[-2].get("Close")) if len(history.index) >= 2 else None
        change_pct = None
        if previous_close not in (None, 0):
            change_pct = round(((close / previous_close) - 1) * 100, 6)

        index_value = history.index[-1]
        trading_date: date = pd.Timestamp(index_value).date()
        volume = finite_number(latest.get("Volume"))
        records.append(
            {
                "ticker": ticker,
                "date": trading_date.isoformat(),
                "close_price": round(close, 4),
                "change_pct": change_pct,
                "volume": int(volume) if volume is not None and volume >= 0 else None,
                "market_cap": market_caps.get(symbol),
            }
        )
    return records


def upsert_records(supabase: Client, records: list[dict[str, Any]]) -> None:
    for batch in chunks(records, UPSERT_SIZE):
        supabase.table("eod_data").upsert(batch, on_conflict="ticker,date").execute()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    supabase = create_client(required_env("SUPABASE_URL"), required_env("SUPABASE_SERVICE_ROLE_KEY"))
    tickers = fetch_all_ordinary_tickers(supabase)
    if not tickers:
        LOGGER.info("No ordinary Bursa tickers found; nothing to fetch")
        return

    LOGGER.info("Fetching EOD data for %s ordinary shares", len(tickers))
    records: list[dict[str, Any]] = []
    for batch_number, batch in enumerate(chunks(tickers, BATCH_SIZE), start=1):
        batch_records = fetch_batch(batch)
        records.extend(batch_records)
        LOGGER.info("Batch %s returned %s/%s rows", batch_number, len(batch_records), len(batch))

    if not records:
        raise RuntimeError("yfinance returned no valid EOD records")
    upsert_records(supabase, records)
    LOGGER.info("Upserted %s EOD records", len(records))


if __name__ == "__main__":
    main()
