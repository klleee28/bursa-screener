"use client"

import { useActionState } from "react"
import { BookmarkCheckIcon, BookmarkPlusIcon, BookmarkXIcon } from "lucide-react"

import { removeSavedTickerAction, saveTickerAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function SavedTickerAction({ ticker, saved, disabled = false }: { ticker: string; saved: boolean; disabled?: boolean }) {
  const action = saved ? removeSavedTickerAction : saveTickerAction
  const [state, formAction, pending] = useActionState(action, {})
  const label = saved ? `Remove ${ticker} from saved tickers` : `Save ${ticker}`

  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <input type="hidden" name="ticker" value={ticker} />
      {state.error ? <span role="alert" className="max-w-40 text-right text-xs text-destructive">{state.error}</span> : null}
      <Button type="submit" variant="ghost" size="icon-sm" disabled={disabled || pending} aria-label={label} title={label}>
        {pending ? <Spinner /> : saved ? <BookmarkXIcon /> : state.success ? <BookmarkCheckIcon /> : <BookmarkPlusIcon />}
      </Button>
    </form>
  )
}
