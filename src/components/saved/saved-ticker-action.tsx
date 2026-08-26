"use client"

import { useState, useTransition, type FormEvent } from "react"
import { BookmarkPlusIcon, BookmarkXIcon } from "lucide-react"

import { removeSavedTickerAction, saveTickerAction } from "@/app/actions"
import { Button } from "@/components/ui/button"

export function SavedTickerAction({
  ticker,
  saved,
  source,
  disabled = false,
  onOptimisticChange,
}: {
  ticker: string
  saved: boolean
  source: "whitelist" | "saved"
  disabled?: boolean
  onOptimisticChange: (ticker: string, saved: boolean) => void
}) {
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()
  const label = saved ? `Remove ${ticker} from saved tickers` : `Save ${ticker}`

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || pending) return

    const formData = new FormData(event.currentTarget)
    const wasSaved = saved
    const nextSaved = !wasSaved
    const action = wasSaved ? removeSavedTickerAction : saveTickerAction

    setError(undefined)
    onOptimisticChange(ticker, nextSaved)
    startTransition(async () => {
      try {
        const result = await action({}, formData)
        if (result.error) {
          onOptimisticChange(ticker, wasSaved)
          setError(result.error)
        }
      } catch {
        onOptimisticChange(ticker, wasSaved)
        setError("Unable to update the saved ticker. Try again.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center justify-end gap-2">
      <input type="hidden" name="ticker" value={ticker} />
      <input type="hidden" name="source" value={source} />
      {error ? <span role="alert" className="max-w-40 text-right text-xs text-destructive">{error}</span> : null}
      <Button type="submit" variant="ghost" size="icon-sm" disabled={disabled || pending} aria-label={label} title={label} aria-busy={pending}>
        {saved ? <BookmarkXIcon /> : <BookmarkPlusIcon />}
      </Button>
    </form>
  )
}
