export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      bursa_master: {
        Row: { ticker: string; name: string; market: string; sector: string; is_ordinary: boolean }
        Insert: { ticker: string; name: string; market: string; sector: string; is_ordinary?: boolean }
        Update: { ticker?: string; name?: string; market?: string; sector?: string; is_ordinary?: boolean }
        Relationships: []
      }
      blacklist: {
        Row: { id: string; ticker: string; name: string; reason: string; created_at: string }
        Insert: { id?: string; ticker: string; name: string; reason: string; created_at?: string }
        Update: { id?: string; ticker?: string; name?: string; reason?: string; created_at?: string }
        Relationships: [{ foreignKeyName: "blacklist_ticker_fkey"; columns: ["ticker"]; isOneToOne: true; referencedRelation: "bursa_master"; referencedColumns: ["ticker"] }]
      }
      eod_data: {
        Row: { ticker: string; date: string; close_price: number | null; change_pct: number | null; volume: number | null; market_cap: number | null }
        Insert: { ticker: string; date: string; close_price?: number | null; change_pct?: number | null; volume?: number | null; market_cap?: number | null }
        Update: { ticker?: string; date?: string; close_price?: number | null; change_pct?: number | null; volume?: number | null; market_cap?: number | null }
        Relationships: [{ foreignKeyName: "eod_data_ticker_fkey"; columns: ["ticker"]; isOneToOne: false; referencedRelation: "bursa_master"; referencedColumns: ["ticker"] }]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
