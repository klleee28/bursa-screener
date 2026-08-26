"use client"

import { useActionState, useMemo, useState } from "react"
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react"

import { addBlacklistAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import type { BlacklistEntry, BursaMaster } from "@/lib/types"

export function BlacklistForm({ master, entries }: { master: BursaMaster[]; entries: BlacklistEntry[] }) {
  const [state, action, pending] = useActionState(addBlacklistAction, {})
  const [selectedTicker, setSelectedTicker] = useState("")
  const [open, setOpen] = useState(false)
  const excluded = useMemo(() => new Set(entries.map((entry) => entry.ticker)), [entries])
  const available = useMemo(() => master.filter((entry) => !excluded.has(entry.ticker)), [master, excluded])
  const selected = available.find((entry) => entry.ticker === selectedTicker)

  return (
    <section className="form-surface" aria-labelledby="add-exclusion-title">
      <h2 id="add-exclusion-title" className="section-title">Add to blacklist</h2>
      <form action={action}>
        <FieldGroup className="blacklist-form-grid">
          <Field>
            <FieldLabel htmlFor="ticker-trigger">Ticker <span aria-hidden="true" className="text-destructive">*</span></FieldLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger id="ticker-trigger" render={<Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between" />}>
                <span className="truncate">{selected ? `${selected.ticker} · ${selected.name}` : "Search ticker or company"}</span>
                <ChevronsUpDownIcon data-icon="inline-end" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-(--anchor-width) min-w-80 p-0">
                <Command>
                  <CommandInput placeholder="Search ticker or company…" />
                  <CommandList>
                    <CommandEmpty>No eligible ticker found.</CommandEmpty>
                    <CommandGroup>
                      {available.map((company) => (
                        <CommandItem key={company.ticker} value={`${company.ticker} ${company.name}`} data-checked={selectedTicker === company.ticker} onSelect={() => { setSelectedTicker(company.ticker); setOpen(false) }}>
                          <div className="min-w-0 flex-1"><p className="font-medium">{company.ticker} · {company.name}</p><p className="truncate text-xs text-muted-foreground">{company.market} · {company.sector}</p></div>
                          {selectedTicker === company.ticker ? <CheckIcon /> : null}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <input type="hidden" name="ticker" value={selected?.ticker ?? ""} />
          </Field>
          <Field data-disabled>
            <FieldLabel htmlFor="company">Company</FieldLabel>
            <Input id="company" value={selected?.name ?? "Select a ticker first"} disabled />
            <input type="hidden" name="name" value={selected?.name ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="reason">Reason <span aria-hidden="true" className="text-destructive">*</span></FieldLabel>
            <Textarea id="reason" name="reason" placeholder="State the Trading Policy Statement rule…" minLength={5} maxLength={500} required />
            <FieldDescription>Keep the rationale specific and auditable.</FieldDescription>
          </Field>
          <Field className="justify-end">
            <Button type="submit" size="lg" disabled={pending || !selected}>
              <PlusIcon data-icon="inline-start" />{pending ? "Adding…" : "Add exclusion"}
            </Button>
          </Field>
        </FieldGroup>
        {state.error ? <FieldError className="mt-4">{state.error}</FieldError> : null}
        {state.success ? <p role="status" className="mt-4 text-sm text-positive">{state.success}</p> : null}
      </form>
    </section>
  )
}
