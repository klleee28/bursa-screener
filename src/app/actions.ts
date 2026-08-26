"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { isDevelopmentDemo } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"

export type ActionState = { error?: string; success?: string }

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must contain at least 8 characters"),
})

const blacklistSchema = z.object({
  ticker: z.string().regex(/^\d{4,5}$/, "Select a valid Bursa ticker"),
  name: z.string().min(1, "Company name is required"),
  reason: z.string().trim().min(5, "Give a brief policy reason").max(500, "Keep the reason under 500 characters"),
})

const tickerSchema = z.string().regex(/^\d{4,5}$/, "Select a valid Bursa ticker")

export async function signInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (isDevelopmentDemo()) redirect("/")

  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid sign-in details" }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: "Email or password is incorrect" }
  redirect("/")
}

export async function signOutAction() {
  if (!isDevelopmentDemo()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect("/login")
}

async function requireAuthenticatedClient() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect("/login")
  return { supabase, user: data.user }
}

export async function addBlacklistAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = blacklistSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form details" }
  if (isDevelopmentDemo()) return { success: "Demo mode: exclusion validated successfully." }

  const { supabase } = await requireAuthenticatedClient()
  const { data: master, error: masterError } = await supabase
    .from("bursa_master")
    .select("ticker,name,is_ordinary")
    .eq("ticker", parsed.data.ticker)
    .eq("is_ordinary", true)
    .single()

  if (masterError || !master || master.name !== parsed.data.name) return { error: "Ticker does not match the ordinary-share master list" }

  const { error } = await supabase.from("blacklist").insert({
    ticker: master.ticker,
    name: master.name,
    reason: parsed.data.reason,
  })
  if (error?.code === "23505") return { error: "That ticker is already blacklisted" }
  if (error) return { error: "Unable to add the exclusion. Try again." }

  revalidatePath("/")
  revalidatePath("/blacklist")
  return { success: `${master.ticker} added to the blacklist.` }
}

export async function removeBlacklistAction(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"))
  if (!id.success || isDevelopmentDemo()) return

  const { supabase } = await requireAuthenticatedClient()
  const { error } = await supabase.from("blacklist").delete().eq("id", id.data)
  if (error) throw new Error("Unable to remove the exclusion")
  revalidatePath("/")
  revalidatePath("/blacklist")
}

export async function saveTickerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const ticker = tickerSchema.safeParse(formData.get("ticker"))
  if (!ticker.success) return { error: ticker.error.issues[0]?.message ?? "Invalid Bursa ticker" }
  if (isDevelopmentDemo()) return { success: "Demo mode: ticker saved." }

  const { supabase, user } = await requireAuthenticatedClient()

  const [masterResult, blacklistResult] = await Promise.all([
    supabase.from("bursa_master").select("ticker").eq("ticker", ticker.data).eq("is_ordinary", true).maybeSingle(),
    supabase.from("blacklist").select("ticker").eq("ticker", ticker.data).maybeSingle(),
  ])
  if (masterResult.error || !masterResult.data) return { error: "Ticker is not in the ordinary-share master list" }
  if (blacklistResult.error) return { error: "Unable to verify the blacklist" }
  if (blacklistResult.data) return { error: "Blacklisted tickers cannot be saved" }

  const { error } = await supabase.from("saved_tickers").insert({ user_id: user.id, ticker: ticker.data })
  if (error?.code === "23505") return { success: "Ticker is already saved." }
  if (error?.code === "42P01" || error?.code === "PGRST205") return { error: "Apply the saved-tickers database migration first" }
  if (error) return { error: "Unable to save the ticker. Try again." }

  revalidatePath("/")
  revalidatePath("/saved")
  return { success: `${ticker.data} saved.` }
}

export async function removeSavedTickerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const ticker = tickerSchema.safeParse(formData.get("ticker"))
  if (!ticker.success) return { error: ticker.error.issues[0]?.message ?? "Invalid Bursa ticker" }
  if (isDevelopmentDemo()) return { success: "Demo mode: ticker removed." }

  const { supabase, user } = await requireAuthenticatedClient()
  const { error } = await supabase.from("saved_tickers").delete().eq("user_id", user.id).eq("ticker", ticker.data)
  if (error?.code === "42P01" || error?.code === "PGRST205") return { error: "Apply the saved-tickers database migration first" }
  if (error) return { error: "Unable to remove the ticker. Try again." }

  revalidatePath("/")
  revalidatePath("/saved")
  return { success: `${ticker.data} removed.` }
}
