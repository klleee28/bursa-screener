"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { isDevelopmentDemo } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"

export type ActionState = { error?: string; success?: string; url?: string }

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
const blacklistTickerSchema = z.object({
  ticker: tickerSchema,
  reason: z.string().trim().min(5, "Give a brief policy reason").max(500, "Keep the reason under 500 characters"),
})
const actionSourceSchema = z.enum(["whitelist", "saved"]).catch("whitelist")

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
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) redirect("/login")
  return { supabase, userId }
}

function revalidateSavedTickerDestination(source: "whitelist" | "saved") {
  // The current table updates optimistically. Only invalidate the other route,
  // avoiding a full RSC reload of the page the user is interacting with.
  revalidatePath(source === "saved" ? "/" : "/saved")
}

function isMissingSavedTickerFunction(error: { code?: string } | null) {
  return error?.code === "42883" || error?.code === "PGRST202"
}

export async function triggerEodRefreshAction(state: ActionState, formData: FormData): Promise<ActionState> {
  void state
  void formData
  if (isDevelopmentDemo()) return { success: "Demo mode: market data refresh queued." }

  await requireAuthenticatedClient()

  const token = process.env.GITHUB_ACTIONS_TOKEN
  const repository = z.string().regex(/^[\w.-]+\/[\w.-]+$/).safeParse(process.env.GITHUB_REPOSITORY ?? "klleee28/bursa-screener")
  if (!token) return { error: "Add GITHUB_ACTIONS_TOKEN to Vercel before using manual refresh." }
  if (!repository.success) return { error: "GITHUB_REPOSITORY must use the owner/repository format." }

  const [owner, repo] = repository.data.split("/")
  const workflow = encodeURIComponent(process.env.GITHUB_EOD_WORKFLOW ?? "fetch_eod.yml")
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "bursa-screener",
        "X-GitHub-Api-Version": "2026-03-10",
      },
      body: JSON.stringify({ ref: process.env.GITHUB_EOD_REF ?? "main" }),
      cache: "no-store",
    },
  )

  if (response.status === 401 || response.status === 403) {
    return { error: "GitHub rejected the token. Grant it Actions: write access to this repository." }
  }
  if (response.status === 404) return { error: "GitHub could not find the repository or EOD workflow." }
  if (!response.ok) return { error: "Unable to queue the market data refresh. Try again." }

  const run = response.status === 204 ? null : await response.json() as { html_url?: string }
  return {
    success: "Refresh queued. GitHub Actions will update the latest market data in a few minutes.",
    url: run?.html_url,
  }
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

export async function blacklistTickerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = blacklistTickerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the blacklist reason" }
  if (isDevelopmentDemo()) return { success: `Demo mode: ${parsed.data.ticker} added to the blacklist.` }

  const { supabase, userId } = await requireAuthenticatedClient()
  const { data: master, error: masterError } = await supabase
    .from("bursa_master")
    .select("ticker,name")
    .eq("ticker", parsed.data.ticker)
    .eq("is_ordinary", true)
    .single()

  if (masterError || !master) return { error: "Ticker is not in the ordinary-share master list" }

  const { error } = await supabase.from("blacklist").insert({
    ticker: master.ticker,
    name: master.name,
    reason: parsed.data.reason,
  })
  if (error?.code === "23505") return { error: "That ticker is already blacklisted" }
  if (error) return { error: "Unable to add the exclusion. Try again." }

  // A blacklisted ticker cannot remain in the user's saved execution list.
  await supabase.from("saved_tickers").delete().eq("user_id", userId).eq("ticker", master.ticker)

  // The whitelist row is removed optimistically in the browser. Invalidate only
  // the other affected routes to avoid an expensive refresh of the active table.
  revalidatePath("/blacklist")
  revalidatePath("/saved")
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

  const source = actionSourceSchema.parse(formData.get("source"))
  const { supabase, userId } = await requireAuthenticatedClient()

  const rpcResult = await supabase.rpc("save_ticker", { p_ticker: ticker.data })
  if (!rpcResult.error) {
    if (rpcResult.data === "blacklisted") return { error: "Blacklisted tickers cannot be saved" }
    if (rpcResult.data === "not_eligible") return { error: "Ticker is not in the ordinary-share master list" }
    revalidateSavedTickerDestination(source)
    return { success: rpcResult.data === "already_saved" ? "Ticker is already saved." : `${ticker.data} saved.` }
  }
  if (!isMissingSavedTickerFunction(rpcResult.error)) return { error: "Unable to save the ticker. Try again." }

  // Backwards-compatible path until the performance migration is applied.
  const [masterResult, blacklistResult] = await Promise.all([
    supabase.from("bursa_master").select("ticker").eq("ticker", ticker.data).eq("is_ordinary", true).maybeSingle(),
    supabase.from("blacklist").select("ticker").eq("ticker", ticker.data).maybeSingle(),
  ])
  if (masterResult.error || !masterResult.data) return { error: "Ticker is not in the ordinary-share master list" }
  if (blacklistResult.error) return { error: "Unable to verify the blacklist" }
  if (blacklistResult.data) return { error: "Blacklisted tickers cannot be saved" }

  const { error } = await supabase.from("saved_tickers").insert({ user_id: userId, ticker: ticker.data })
  if (error?.code === "23505") return { success: "Ticker is already saved." }
  if (error?.code === "42P01" || error?.code === "PGRST205") return { error: "Apply the saved-tickers database migration first" }
  if (error) return { error: "Unable to save the ticker. Try again." }

  revalidateSavedTickerDestination(source)
  return { success: `${ticker.data} saved.` }
}

export async function removeSavedTickerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const ticker = tickerSchema.safeParse(formData.get("ticker"))
  if (!ticker.success) return { error: ticker.error.issues[0]?.message ?? "Invalid Bursa ticker" }
  if (isDevelopmentDemo()) return { success: "Demo mode: ticker removed." }

  const source = actionSourceSchema.parse(formData.get("source"))
  const { supabase, userId } = await requireAuthenticatedClient()

  const rpcResult = await supabase.rpc("remove_saved_ticker", { p_ticker: ticker.data })
  if (!rpcResult.error) {
    revalidateSavedTickerDestination(source)
    return { success: `${ticker.data} removed.` }
  }
  if (!isMissingSavedTickerFunction(rpcResult.error)) return { error: "Unable to remove the ticker. Try again." }

  const { error } = await supabase.from("saved_tickers").delete().eq("user_id", userId).eq("ticker", ticker.data)
  if (error?.code === "42P01" || error?.code === "PGRST205") return { error: "Apply the saved-tickers database migration first" }
  if (error) return { error: "Unable to remove the ticker. Try again." }

  revalidateSavedTickerDestination(source)
  return { success: `${ticker.data} removed.` }
}
