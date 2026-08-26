import type { BlacklistPageData, DashboardData, EodData } from "@/lib/types"
import { isDevelopmentDemo } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import { mockBlacklist, mockMaster, mockWhitelist } from "@/lib/data/mock"

function assertResult(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`)
}

export async function getDashboardData(): Promise<DashboardData> {
  if (isDevelopmentDemo()) {
    return { totalTracked: 946, blacklisted: 28, whitelisted: 918, latestDate: "2026-08-25", rows: mockWhitelist }
  }

  const supabase = await createClient()
  const [masterResult, blacklistResult, latestResult] = await Promise.all([
    supabase.from("bursa_master").select("ticker,name,market,sector,is_ordinary").eq("is_ordinary", true).order("ticker"),
    supabase.from("blacklist").select("ticker"),
    supabase.from("eod_data").select("date").order("date", { ascending: false }).limit(1).maybeSingle(),
  ])

  assertResult(masterResult.error, "Unable to load Bursa master")
  assertResult(blacklistResult.error, "Unable to load blacklist")
  assertResult(latestResult.error, "Unable to find latest EOD date")

  const latestDate = latestResult.data?.date ?? null
  let eodRows: EodData[] = []
  if (latestDate) {
    const eodResult = await supabase
      .from("eod_data")
      .select("ticker,date,close_price,change_pct,volume,market_cap")
      .eq("date", latestDate)
    assertResult(eodResult.error, "Unable to load EOD data")
    eodRows = (eodResult.data ?? []) as EodData[]
  }

  const excluded = new Set((blacklistResult.data ?? []).map((entry) => entry.ticker))
  const eodByTicker = new Map(eodRows.map((row) => [row.ticker, row]))
  const master = masterResult.data ?? []
  const rows = master.flatMap((company) => {
    if (excluded.has(company.ticker)) return []
    const eod = eodByTicker.get(company.ticker)
    return [{ ...company, date: eod?.date ?? null, close_price: eod?.close_price ?? null, change_pct: eod?.change_pct ?? null, volume: eod?.volume ?? null, market_cap: eod?.market_cap ?? null }]
  })

  const blacklisted = master.reduce((count, company) => count + Number(excluded.has(company.ticker)), 0)
  return { totalTracked: master.length, blacklisted, whitelisted: rows.length, latestDate, rows }
}

export async function getBlacklistPageData(): Promise<BlacklistPageData> {
  if (isDevelopmentDemo()) return { entries: mockBlacklist, master: mockMaster, latestDate: "2026-08-25" }

  const supabase = await createClient()
  const [entriesResult, masterResult, latestResult] = await Promise.all([
    supabase.from("blacklist").select("id,ticker,name,reason,created_at").order("created_at", { ascending: false }),
    supabase.from("bursa_master").select("ticker,name,market,sector,is_ordinary").eq("is_ordinary", true).order("ticker"),
    supabase.from("eod_data").select("date").order("date", { ascending: false }).limit(1).maybeSingle(),
  ])
  assertResult(entriesResult.error, "Unable to load blacklist")
  assertResult(masterResult.error, "Unable to load Bursa master")
  assertResult(latestResult.error, "Unable to find latest EOD date")
  return { entries: entriesResult.data ?? [], master: masterResult.data ?? [], latestDate: latestResult.data?.date ?? null }
}
