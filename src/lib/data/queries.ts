import type { BlacklistPageData, BursaMaster, DashboardData, EodData, SavedTickerPageData, WhitelistRow } from "@/lib/types"
import { isDevelopmentDemo } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import { mockBlacklist, mockMaster, mockWhitelist } from "@/lib/data/mock"

const PAGE_SIZE = 1_000
const EMPTY_TICKER_IDS: string[] = []
type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

function assertResult(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`)
}

function isMissingSavedTickerTable(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205"
}

function mergeMarketData(master: BursaMaster[], eodRows: EodData[]) {
  const eodByTicker = new Map(eodRows.map((row) => [row.ticker, row]))
  return master.map((company) => {
    const eod = eodByTicker.get(company.ticker)
    return { ...company, date: eod?.date ?? null, close_price: eod?.close_price ?? null, change_pct: eod?.change_pct ?? null, volume: eod?.volume ?? null, market_cap: eod?.market_cap ?? null }
  }) satisfies WhitelistRow[]
}

async function fetchAllOrdinaryMaster(supabase: ServerSupabaseClient): Promise<BursaMaster[]> {
  const rows: BursaMaster[] = []
  for (let start = 0; ; start += PAGE_SIZE) {
    const result = await supabase
      .from("bursa_master")
      .select("ticker,name,market,sector,is_ordinary")
      .eq("is_ordinary", true)
      .order("ticker")
      .range(start, start + PAGE_SIZE - 1)
    assertResult(result.error, "Unable to load Bursa master")
    rows.push(...(result.data ?? []))
    if ((result.data?.length ?? 0) < PAGE_SIZE) return rows
  }
}

async function fetchAllEodForDate(supabase: ServerSupabaseClient, date: string): Promise<EodData[]> {
  const rows: EodData[] = []
  for (let start = 0; ; start += PAGE_SIZE) {
    const result = await supabase
      .from("eod_data")
      .select("ticker,date,close_price,change_pct,volume,market_cap")
      .eq("date", date)
      .order("ticker")
      .range(start, start + PAGE_SIZE - 1)
    assertResult(result.error, "Unable to load EOD data")
    rows.push(...((result.data ?? []) as EodData[]))
    if ((result.data?.length ?? 0) < PAGE_SIZE) return rows
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  if (isDevelopmentDemo()) {
    return { totalTracked: 946, blacklisted: 28, whitelisted: 918, latestDate: "2026-08-25", rows: mockWhitelist, savedTickerIds: ["1155", "5225"], savedFeatureReady: true }
  }

  const supabase = await createClient()
  const [master, blacklistResult, latestResult, savedResult] = await Promise.all([
    fetchAllOrdinaryMaster(supabase),
    supabase.from("blacklist").select("ticker"),
    supabase.from("eod_data").select("date").order("date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("saved_tickers").select("ticker"),
  ])

  assertResult(blacklistResult.error, "Unable to load blacklist")
  assertResult(latestResult.error, "Unable to find latest EOD date")
  if (savedResult.error && !isMissingSavedTickerTable(savedResult.error)) {
    throw new Error(`Unable to load saved tickers: ${savedResult.error.message}`)
  }

  const latestDate = latestResult.data?.date ?? null
  const eodRows = latestDate ? await fetchAllEodForDate(supabase, latestDate) : []

  const excluded = new Set((blacklistResult.data ?? []).map((entry) => entry.ticker))
  const rows = mergeMarketData(master.filter((company) => !excluded.has(company.ticker)), eodRows)

  const blacklisted = master.reduce((count, company) => count + Number(excluded.has(company.ticker)), 0)
  return {
    totalTracked: master.length,
    blacklisted,
    whitelisted: rows.length,
    latestDate,
    rows,
    savedTickerIds: savedResult.error ? EMPTY_TICKER_IDS : (savedResult.data ?? []).map((entry) => entry.ticker),
    savedFeatureReady: !savedResult.error,
  }
}

export async function getBlacklistPageData(): Promise<BlacklistPageData> {
  if (isDevelopmentDemo()) return { entries: mockBlacklist, master: mockMaster, latestDate: "2026-08-25" }

  const supabase = await createClient()
  const [entriesResult, master, latestResult] = await Promise.all([
    supabase.from("blacklist").select("id,ticker,name,reason,created_at").order("created_at", { ascending: false }),
    fetchAllOrdinaryMaster(supabase),
    supabase.from("eod_data").select("date").order("date", { ascending: false }).limit(1).maybeSingle(),
  ])
  assertResult(entriesResult.error, "Unable to load blacklist")
  assertResult(latestResult.error, "Unable to find latest EOD date")
  return { entries: entriesResult.data ?? [], master, latestDate: latestResult.data?.date ?? null }
}

export async function getSavedTickerPageData(): Promise<SavedTickerPageData> {
  if (isDevelopmentDemo()) {
    return { latestDate: "2026-08-25", rows: mockWhitelist.filter((row) => ["1155", "5225"].includes(row.ticker)), savedFeatureReady: true }
  }

  const supabase = await createClient()
  const [savedResult, latestResult] = await Promise.all([
    supabase.from("saved_tickers").select("ticker").order("created_at", { ascending: false }),
    supabase.from("eod_data").select("date").order("date", { ascending: false }).limit(1).maybeSingle(),
  ])

  assertResult(latestResult.error, "Unable to find latest EOD date")
  if (savedResult.error && isMissingSavedTickerTable(savedResult.error)) {
    return { latestDate: latestResult.data?.date ?? null, rows: [], savedFeatureReady: false }
  }
  assertResult(savedResult.error, "Unable to load saved tickers")

  const tickerIds = (savedResult.data ?? []).map((entry) => entry.ticker)
  if (!tickerIds.length) return { latestDate: latestResult.data?.date ?? null, rows: [], savedFeatureReady: true }

  const latestDate = latestResult.data?.date ?? null
  const masterPromise = supabase
    .from("bursa_master")
    .select("ticker,name,market,sector,is_ordinary")
    .in("ticker", tickerIds)
    .eq("is_ordinary", true)
  const eodPromise = latestDate
    ? supabase.from("eod_data").select("ticker,date,close_price,change_pct,volume,market_cap").eq("date", latestDate).in("ticker", tickerIds)
    : Promise.resolve({ data: [] as EodData[], error: null })
  const [masterResult, eodResult] = await Promise.all([masterPromise, eodPromise])
  assertResult(masterResult.error, "Unable to load saved Bursa tickers")
  assertResult(eodResult.error, "Unable to load saved ticker EOD data")

  const masterByTicker = new Map((masterResult.data ?? []).map((row) => [row.ticker, row]))
  const orderedMaster = tickerIds.flatMap((ticker) => {
    const row = masterByTicker.get(ticker)
    return row ? [row] : []
  })
  return { latestDate, rows: mergeMarketData(orderedMaster, (eodResult.data ?? []) as EodData[]), savedFeatureReady: true }
}
