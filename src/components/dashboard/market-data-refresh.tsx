"use client"

import { useActionState } from "react"
import { ExternalLinkIcon, RefreshCwIcon } from "lucide-react"

import { triggerEodRefreshAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function MarketDataRefresh() {
  const [state, action, pending] = useActionState(triggerEodRefreshAction, {})

  return (
    <div className="flex max-w-sm flex-col items-start gap-2 sm:items-end">
      <form action={action}>
        <Button type="submit" variant="outline" size="sm" disabled={pending} title="Queue the GitHub Actions market data refresh">
          {pending ? <Spinner /> : <RefreshCwIcon data-icon="inline-start" />}
          {pending ? "Queuing…" : "Refresh market data"}
        </Button>
      </form>
      {state.error ? <p role="alert" className="text-xs leading-5 text-destructive sm:text-right">{state.error}</p> : null}
      {state.success ? (
        <p role="status" className="text-xs leading-5 text-positive sm:text-right">
          {state.success}
          {state.url ? (
            <a href={state.url} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-1 underline underline-offset-2">
              View run <ExternalLinkIcon className="size-3" />
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}
