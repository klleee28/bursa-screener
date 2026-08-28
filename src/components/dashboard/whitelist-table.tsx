"use client"

import { useDeferredValue, useMemo, useState } from "react"
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react"

import { BlacklistTickerAction } from "@/components/blacklist/blacklist-ticker-action"
import { MultiSelectFilter } from "@/components/dashboard/multi-select-filter"
import { CsvExportButton, type CsvColumn } from "@/components/export/csv-export-button"
import { SavedTickerAction } from "@/components/saved/saved-ticker-action"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatNumber, formatPercent, formatPrice } from "@/lib/format"
import type { WhitelistRow } from "@/lib/types"
import { cn } from "@/lib/utils"

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})

const columnHelper = createColumnHelper<typeof features, WhitelistRow>()
const numericColumns = ["close_price", "change_pct", "volume"]
const actionColumns = ["saved", "blacklist"]
const emptySavedTickerIds: string[] = []
const whitelistExportColumns: CsvColumn<WhitelistRow>[] = [
  { header: "Ticker", value: (row) => row.ticker },
  { header: "Company", value: (row) => row.name },
  { header: "Market", value: (row) => row.market },
  { header: "Sector", value: (row) => row.sector },
  { header: "Date", value: (row) => row.date },
  { header: "Close Price", value: (row) => row.close_price },
  { header: "1D Change %", value: (row) => row.change_pct },
  { header: "Volume", value: (row) => row.volume },
  { header: "Market Cap", value: (row) => row.market_cap },
]

export function WhitelistTable({
  rows,
  savedTickerIds = emptySavedTickerIds,
  savedFeatureReady = true,
  mode = "whitelist",
}: {
  rows: WhitelistRow[]
  savedTickerIds?: string[]
  savedFeatureReady?: boolean
  mode?: "whitelist" | "saved"
}) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [markets, setMarkets] = useState<string[]>([])
  const [sectors, setSectors] = useState<string[]>([])
  const [savedTickerState, setSavedTickerState] = useState(() => new Set(savedTickerIds))
  const [blacklistedTickerState, setBlacklistedTickerState] = useState(() => new Set<string>())
  const [blacklistFeedback, setBlacklistFeedback] = useState<{ message: string; error: boolean }>()

  function handleSavedTickerChange(ticker: string, saved: boolean) {
    setSavedTickerState((current) => {
      const next = new Set(current)
      if (saved) next.add(ticker)
      else next.delete(ticker)
      return next
    })
  }

  function handleBlacklistChange(ticker: string, blacklisted: boolean) {
    setBlacklistedTickerState((current) => {
      const next = new Set(current)
      if (blacklisted) next.add(ticker)
      else next.delete(ticker)
      return next
    })
  }

  const columns = useMemo(() => columnHelper.columns([
    columnHelper.accessor("ticker", { header: "Ticker" }),
    columnHelper.accessor("name", { header: "Company", cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> }),
    columnHelper.accessor("market", { header: "Market" }),
    columnHelper.accessor("sector", { header: "Sector" }),
    columnHelper.accessor("close_price", { header: "Close", sortUndefined: "last", cell: ({ getValue }) => <span className="tabular-nums">{formatPrice(getValue())}</span> }),
    columnHelper.accessor("change_pct", {
      header: "1D change",
      sortUndefined: "last",
      cell: ({ getValue }) => {
        const value = getValue()
        return <span className={cn("tabular-nums", value != null && value > 0 ? "text-positive" : value != null && value < 0 ? "text-destructive" : "text-muted-foreground")}>{formatPercent(value)}</span>
      },
    }),
    columnHelper.accessor("volume", { header: "Volume", sortUndefined: "last", cell: ({ getValue }) => <span className="tabular-nums">{formatNumber(getValue())}</span> }),
    columnHelper.display({
      id: "saved",
      header: mode === "saved" ? "Remove" : "Save",
      cell: ({ row }) => (
        <SavedTickerAction
          ticker={row.original.ticker}
          saved={savedTickerState.has(row.original.ticker)}
          source={mode}
          disabled={!savedFeatureReady}
          onOptimisticChange={handleSavedTickerChange}
        />
      ),
    }),
    ...(mode === "whitelist" ? [columnHelper.display({
      id: "blacklist",
      header: "Blacklist",
      cell: ({ row }) => (
        <BlacklistTickerAction
          ticker={row.original.ticker}
          name={row.original.name}
          onOptimisticChange={handleBlacklistChange}
          onResult={(message, error) => setBlacklistFeedback({ message, error })}
        />
      ),
    })] : []),
  ]), [mode, savedFeatureReady, savedTickerState])

  const marketOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.market))).sort(), [rows])
  const sectorOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.sector))).sort(), [rows])
  const filteredRows = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    return rows.filter((row) => {
      if (mode === "whitelist" && blacklistedTickerState.has(row.ticker)) return false
      if (mode === "saved" && !savedTickerState.has(row.ticker)) return false
      if (markets.length && !markets.includes(row.market)) return false
      if (sectors.length && !sectors.includes(row.sector)) return false
      return !query || row.ticker.toLowerCase().includes(query) || row.name.toLowerCase().includes(query)
    })
  }, [rows, deferredSearch, markets, sectors, mode, savedTickerState, blacklistedTickerState])

  const table = useTable({
    features,
    columns,
    data: filteredRows,
    getRowId: (row) => row.ticker,
    initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
    autoResetPageIndex: true,
    enableSortingRemoval: false,
  })

  const pageStart = filteredRows.length === 0 ? 0 : table.state.pagination.pageIndex * table.state.pagination.pageSize + 1
  const pageEnd = Math.min(filteredRows.length, pageStart + table.state.pagination.pageSize - 1)

  return (
    <section aria-label={mode === "saved" ? "Saved securities" : "Whitelisted securities"} className="mt-12">
      <div className="table-toolbar">
        <InputGroup className="search-control">
          <InputGroupAddon><SearchIcon /></InputGroupAddon>
          <InputGroupInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ticker or company" aria-label="Search ticker or company" />
        </InputGroup>
        <div className="flex flex-wrap gap-3">
          <MultiSelectFilter label="Markets" options={marketOptions} selected={markets} onChange={setMarkets} />
          <MultiSelectFilter label="Sectors" options={sectorOptions} selected={sectors} onChange={setSectors} />
          <CsvExportButton
            rows={filteredRows}
            columns={whitelistExportColumns}
            filename={mode === "saved" ? "bursa-saved-tickers" : "bursa-whitelist"}
          />
        </div>
      </div>

      {blacklistFeedback ? (
        <p
          role={blacklistFeedback.error ? "alert" : "status"}
          className={cn("mt-3 text-sm", blacklistFeedback.error ? "text-destructive" : "text-muted-foreground")}
        >
          {blacklistFeedback.message}
        </p>
      ) : null}

      <div className="data-table-shell">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted()
                    return (
                      <TableHead key={header.id} className={cn((numericColumns.includes(header.column.id) || actionColumns.includes(header.column.id)) && "text-right")}>
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button type="button" className={cn("sort-button", (numericColumns.includes(header.column.id) || actionColumns.includes(header.column.id)) && "ml-auto")} onClick={header.column.getToggleSortingHandler()} disabled={!header.column.getCanSort()}>
                            <table.FlexRender header={header} />
                            {sorted === "asc" ? <ArrowUpIcon /> : sorted === "desc" ? <ArrowDownIcon /> : <ArrowUpDownIcon />}
                          </button>
                        ) : (
                          <span className="ml-auto"><table.FlexRender header={header} /></span>
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => <TableCell key={cell.id} className={cn((numericColumns.includes(cell.column.id) || actionColumns.includes(cell.column.id)) && "text-right")}><table.FlexRender cell={cell} /></TableCell>)}
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={columns.length} className="h-36 text-center text-muted-foreground">{mode === "saved" && rows.length === 0 ? "No tickers saved yet. Save one from the whitelist." : "No securities match these filters."}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="table-footer">
          <p>{pageStart}–{pageEnd} of {filteredRows.length}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page"><ChevronLeftIcon /></Button>
            <span className="min-w-24 text-center text-xs font-medium">Page {table.state.pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}</span>
            <Button variant="outline" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page"><ChevronRightIcon /></Button>
          </div>
        </div>
      </div>
    </section>
  )
}
