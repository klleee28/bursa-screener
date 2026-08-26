"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { SearchIcon, Trash2Icon } from "lucide-react"

import { removeBlacklistAction } from "@/app/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCreatedDate } from "@/lib/format"
import type { BlacklistEntry } from "@/lib/types"

export function BlacklistTable({ entries }: { entries: BlacklistEntry[] }) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    return !query ? entries : entries.filter((entry) => `${entry.ticker} ${entry.name} ${entry.reason}`.toLowerCase().includes(query))
  }, [entries, deferredSearch])

  return (
    <section className="data-table-shell mt-5" aria-labelledby="current-exclusions-title">
      <div className="section-toolbar">
        <div><h2 id="current-exclusions-title" className="section-title">Current exclusions</h2><p className="mt-1 text-xs text-muted-foreground">{entries.length} securities</p></div>
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon><SearchIcon /></InputGroupAddon>
          <InputGroupInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search exclusions" aria-label="Search exclusions" />
        </InputGroup>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Ticker</TableHead><TableHead>Company</TableHead><TableHead>Reason</TableHead><TableHead>Added</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length ? filtered.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.ticker}</TableCell>
                <TableCell>{entry.name}</TableCell>
                <TableCell className="min-w-72 text-muted-foreground">{entry.reason}</TableCell>
                <TableCell className="whitespace-nowrap">{formatCreatedDate(entry.created_at)}</TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
                      <Trash2Icon data-icon="inline-start" />Remove
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {entry.ticker}?</AlertDialogTitle>
                        <AlertDialogDescription>This returns {entry.name} to the whitelist on the next refresh.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <form action={removeBlacklistAction}>
                          <input type="hidden" name="id" value={entry.id} />
                          <AlertDialogAction type="submit" variant="destructive">Remove exclusion</AlertDialogAction>
                        </form>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No exclusions match your search.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <div className="table-footer"><p>Showing {filtered.length} of {entries.length} securities</p></div>
    </section>
  )
}
