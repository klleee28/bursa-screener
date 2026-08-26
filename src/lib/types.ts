export type Market = "Main Market" | "ACE Market"

export type BursaMaster = {
  ticker: string
  name: string
  market: Market | string
  sector: string
  is_ordinary: boolean
}

export type BlacklistEntry = {
  id: string
  ticker: string
  name: string
  reason: string
  created_at: string
}

export type EodData = {
  ticker: string
  date: string
  close_price: number | null
  change_pct: number | null
  volume: number | null
  market_cap: number | null
}

export type WhitelistRow = BursaMaster & {
  date: string | null
  close_price: number | null
  change_pct: number | null
  volume: number | null
  market_cap: number | null
}

export type DashboardData = {
  totalTracked: number
  blacklisted: number
  whitelisted: number
  latestDate: string | null
  rows: WhitelistRow[]
  savedTickerIds: string[]
  savedFeatureReady: boolean
}

export type BlacklistPageData = {
  entries: BlacklistEntry[]
  master: BursaMaster[]
  latestDate: string | null
}

export type SavedTickerPageData = {
  latestDate: string | null
  rows: WhitelistRow[]
  savedFeatureReady: boolean
}
