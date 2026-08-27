"use client"

import { useState, useTransition, type FormEvent } from "react"
import { ShieldMinusIcon } from "lucide-react"

import { blacklistTickerAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

export function BlacklistTickerAction({
  ticker,
  name,
  onOptimisticChange,
  onResult,
}: {
  ticker: string
  name: string
  onOptimisticChange: (ticker: string, blacklisted: boolean) => void
  onResult: (message: string, error: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()
  const reasonId = `blacklist-reason-${ticker}`
  const label = `Add ${ticker} to blacklist`

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setError(undefined)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const formData = new FormData(event.currentTarget)
    const reason = formData.get("reason")?.toString().trim() ?? ""
    if (reason.length < 5) {
      setError("Give a brief policy reason")
      return
    }

    setError(undefined)
    setOpen(false)
    onOptimisticChange(ticker, true)
    startTransition(async () => {
      try {
        const result = await blacklistTickerAction({}, formData)
        if (result.error) {
          onOptimisticChange(ticker, false)
          onResult(result.error, true)
          return
        }
        onResult(result.success ?? `${ticker} added to the blacklist.`, false)
      } catch {
        onOptimisticChange(ticker, false)
        onResult("Unable to add the exclusion. Try again.", true)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={label} title={label} />}>
        <ShieldMinusIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Blacklist {ticker}?</DialogTitle>
          <DialogDescription>
            {name} will be removed from the whitelist and your saved tickers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <input type="hidden" name="ticker" value={ticker} />
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor={reasonId}>Policy reason</FieldLabel>
              <Textarea
                id={reasonId}
                name="reason"
                minLength={5}
                maxLength={500}
                required
                autoFocus
                aria-invalid={Boolean(error)}
                placeholder="Why is this ticker excluded?"
              />
              <FieldDescription>Keep the rationale specific and auditable.</FieldDescription>
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" variant="destructive" disabled={pending} aria-busy={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : <ShieldMinusIcon data-icon="inline-start" />}
              {pending ? "Adding…" : "Add to blacklist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
