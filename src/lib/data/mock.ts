import type { BlacklistEntry, BursaMaster, WhitelistRow } from "@/lib/types"

export const mockWhitelist: WhitelistRow[] = [
  { ticker: "1155", name: "MALAYAN BANKING BHD", market: "Main Market", sector: "Financial Services", is_ordinary: true, date: "2026-08-25", close_price: 9.42, change_pct: 1.29, volume: 13245100, market_cap: 113600000000 },
  { ticker: "5347", name: "TENAGA NASIONAL BHD", market: "Main Market", sector: "Utilities", is_ordinary: true, date: "2026-08-25", close_price: 14.32, change_pct: -0.56, volume: 7812300, market_cap: 82800000000 },
  { ticker: "1023", name: "CIMB GROUP HOLDINGS BHD", market: "Main Market", sector: "Financial Services", is_ordinary: true, date: "2026-08-25", close_price: 7.28, change_pct: 0.55, volume: 10234500, market_cap: 77700000000 },
  { ticker: "5225", name: "IHH HEALTHCARE BHD", market: "Main Market", sector: "Health Care", is_ordinary: true, date: "2026-08-25", close_price: 6.88, change_pct: 0.88, volume: 3456200, market_cap: 60600000000 },
  { ticker: "1295", name: "PUBLIC BANK BHD", market: "Main Market", sector: "Financial Services", is_ordinary: true, date: "2026-08-25", close_price: 4.26, change_pct: -0.7, volume: 5678900, market_cap: 82700000000 },
  { ticker: "7277", name: "DIALOG GROUP BHD", market: "Main Market", sector: "Energy", is_ordinary: true, date: "2026-08-25", close_price: 2.41, change_pct: 0.42, volume: 9876600, market_cap: 13600000000 },
  { ticker: "5211", name: "SUNWAY BHD", market: "Main Market", sector: "Industrial Products & Services", is_ordinary: true, date: "2026-08-25", close_price: 4.79, change_pct: -0.42, volume: 4321700, market_cap: 25400000000 },
  { ticker: "5819", name: "HONG LEONG BANK BHD", market: "Main Market", sector: "Financial Services", is_ordinary: true, date: "2026-08-25", close_price: 20.68, change_pct: 0.19, volume: 621300, market_cap: 44800000000 },
  { ticker: "8869", name: "PRESS METAL ALUMINIUM HOLDINGS BHD", market: "Main Market", sector: "Industrial Products & Services", is_ordinary: true, date: "2026-08-25", close_price: 5.86, change_pct: 1.03, volume: 6294500, market_cap: 48300000000 },
  { ticker: "5183", name: "PETRONAS CHEMICALS GROUP BHD", market: "Main Market", sector: "Industrial Products & Services", is_ordinary: true, date: "2026-08-25", close_price: 5.13, change_pct: -1.16, volume: 8123400, market_cap: 41000000000 },
]

export const mockMaster: BursaMaster[] = [
  ...mockWhitelist.map(({ ticker, name, market, sector, is_ordinary }) => ({ ticker, name, market, sector, is_ordinary })),
  { ticker: "4715", name: "GENTING MALAYSIA BHD", market: "Main Market", sector: "Consumer Products & Services", is_ordinary: true },
  { ticker: "6888", name: "AXIATA GROUP BHD", market: "Main Market", sector: "Telecommunications & Media", is_ordinary: true },
  { ticker: "5249", name: "IOI PROPERTIES GROUP BHD", market: "Main Market", sector: "Property", is_ordinary: true },
  { ticker: "2445", name: "KUALA LUMPUR KEPONG BHD", market: "Main Market", sector: "Plantation", is_ordinary: true },
  { ticker: "7293", name: "YINSON HOLDINGS BHD", market: "Main Market", sector: "Energy", is_ordinary: true },
  { ticker: "1651", name: "MALAYSIAN RESOURCES CORPORATION BHD", market: "Main Market", sector: "Construction", is_ordinary: true },
]

export const mockBlacklist: BlacklistEntry[] = [
  { id: "11111111-1111-4111-8111-111111111111", ticker: "4715", name: "GENTING MALAYSIA BHD", reason: "Policy exclusion — gaming exposure", created_at: "2026-08-25T09:00:00Z" },
  { id: "22222222-2222-4222-8222-222222222222", ticker: "6888", name: "AXIATA GROUP BHD", reason: "Financial leverage above policy limit", created_at: "2026-08-24T09:00:00Z" },
  { id: "33333333-3333-4333-8333-333333333333", ticker: "5249", name: "IOI PROPERTIES GROUP BHD", reason: "Property development — sector exclusion", created_at: "2026-08-21T09:00:00Z" },
  { id: "44444444-4444-4444-8444-444444444444", ticker: "2445", name: "KUALA LUMPUR KEPONG BHD", reason: "Commodity price risk — palm oil", created_at: "2026-08-19T09:00:00Z" },
  { id: "55555555-5555-4555-8555-555555555555", ticker: "7293", name: "YINSON HOLDINGS BHD", reason: "Volatility above policy threshold", created_at: "2026-08-18T09:00:00Z" },
  { id: "66666666-6666-4666-8666-666666666666", ticker: "1651", name: "MALAYSIAN RESOURCES CORPORATION BHD", reason: "Governance concern", created_at: "2026-08-15T09:00:00Z" },
]
