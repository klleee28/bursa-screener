"""Synchronize the Bursa Main/ACE ordinary-share master into Supabase.

The EOD job depends on ``bursa_master``. This bootstrap runs first so a new
deployment does not remain empty indefinitely. The source can be overridden
with ``BURSA_MASTER_SOURCE_URL`` without changing application code.
"""

from __future__ import annotations

import argparse
import logging
import os
import re
from html.parser import HTMLParser
from typing import TYPE_CHECKING, Any
from urllib.request import Request, urlopen

if TYPE_CHECKING:
    from supabase import Client

LOGGER = logging.getLogger("bursa-master")
DEFAULT_SOURCE_URL = "https://www.klsescreener.com/v2/screener/quote_results"
MINIMUM_EXPECTED_ORDINARY_SHARES = 800
UPSERT_SIZE = 500
NON_ORDINARY_SECTORS = {
    "closed-end fund",
    "exchange traded fund",
    "exchange traded funds",
    "real estate investment trust",
    "real estate investment trusts",
}


class RosterTableParser(HTMLParser):
    """Extract roster rows without adding a heavyweight HTML dependency."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[dict[str, Any]] = []
        self._in_row = False
        self._in_cell = False
        self._in_small = False
        self._cells: list[str] = []
        self._cell_parts: list[str] = []
        self._small_parts: list[str] = []
        self._smalls: list[str] = []
        self._company_name: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "tr" and "list" in (attributes.get("class") or "").split():
            self._in_row = True
            self._cells = []
            self._smalls = []
            self._company_name = None
        elif tag == "td" and self._in_row:
            self._in_cell = True
            self._cell_parts = []
            if not self._cells and attributes.get("title"):
                self._company_name = attributes["title"].strip()
        elif tag == "small" and self._in_cell:
            self._in_small = True
            self._small_parts = []

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._cell_parts.append(data)
        if self._in_small:
            self._small_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "small" and self._in_small:
            self._smalls.append(" ".join("".join(self._small_parts).split()))
            self._in_small = False
        elif tag == "td" and self._in_cell:
            self._cells.append(" ".join("".join(self._cell_parts).split()))
            self._in_cell = False
        elif tag == "tr" and self._in_row:
            self.rows.append({"cells": self._cells, "smalls": self._smalls, "name": self._company_name})
            self._in_row = False


def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value


def normalize_market(value: str) -> str | None:
    normalized = value.strip().lower()
    if normalized == "main market":
        return "Main Market"
    if normalized == "ace market":
        return "ACE Market"
    return None


def parse_roster(html: str) -> list[dict[str, Any]]:
    parser = RosterTableParser()
    parser.feed(html)
    records: dict[str, dict[str, Any]] = {}

    for row in parser.rows:
        cells = row["cells"]
        smalls = row["smalls"]
        if len(cells) < 3 or not smalls:
            continue

        ticker = cells[1].strip()
        if not re.fullmatch(r"\d{4}", ticker):
            continue

        classification = smalls[-1].strip()
        if "," not in classification:
            continue
        sector, raw_market = (part.strip() for part in classification.rsplit(",", 1))
        market = normalize_market(raw_market)
        if market is None or sector.lower() in NON_ORDINARY_SECTORS:
            continue

        name = str(row["name"] or cells[0]).strip()
        if not name:
            continue
        records[ticker] = {
            "ticker": ticker,
            "name": name,
            "market": market,
            "sector": sector,
            "is_ordinary": True,
        }

    return [records[ticker] for ticker in sorted(records)]


def fetch_roster(source_url: str) -> list[dict[str, Any]]:
    request = Request(source_url, headers={"User-Agent": "BursaFilter/1.0 (+private EOD screener)"})
    with urlopen(request, timeout=60) as response:
        html = response.read().decode("utf-8", errors="replace")
    records = parse_roster(html)
    if len(records) < MINIMUM_EXPECTED_ORDINARY_SHARES:
        raise RuntimeError(
            f"Master source returned only {len(records)} eligible rows; refusing to replace the current universe"
        )
    return records


def synchronize(supabase: "Client", records: list[dict[str, Any]]) -> None:
    # Validation happens before this point, so a transient/blocked source cannot
    # accidentally mark the whole production universe inactive.
    supabase.table("bursa_master").update({"is_ordinary": False}).eq("is_ordinary", True).execute()
    for start in range(0, len(records), UPSERT_SIZE):
        supabase.table("bursa_master").upsert(records[start : start + UPSERT_SIZE], on_conflict="ticker").execute()
    reconciliation = supabase.rpc("reconcile_ticker_aliases").execute()
    LOGGER.info("Reconciled ticker aliases: %s", reconciliation.data)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Fetch and validate without writing to Supabase")
    parser.add_argument("--source-url", default=os.getenv("BURSA_MASTER_SOURCE_URL") or DEFAULT_SOURCE_URL)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    records = fetch_roster(args.source_url)
    market_counts = {market: sum(row["market"] == market for row in records) for market in ("Main Market", "ACE Market")}
    LOGGER.info("Validated %s ordinary shares: %s", len(records), market_counts)

    if args.dry_run:
        return

    from supabase import create_client

    supabase = create_client(required_env("SUPABASE_URL"), required_env("SUPABASE_SERVICE_ROLE_KEY"))
    synchronize(supabase, records)
    LOGGER.info("Synchronized %s Bursa master rows", len(records))


if __name__ == "__main__":
    main()
