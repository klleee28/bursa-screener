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

import { MultiSelectFilter } from "@/components/dashboard/multi-select-filter"
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
const columns = columnHelper.columns([
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
])

export function WhitelistTable({ rows }: { rows: WhitelistRow[] }) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [markets, setMarkets] = useState<string[]>([])
  const [sectors, setSectors] = useState<string[]>([])

  const marketOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.market))).sort(), [rows])
  const sectorOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.sector))).sort(), [rows])
  const filteredRows = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    return rows.filter((row) => {
      if (markets.length && !markets.includes(row.market)) return false
      if (sectors.length && !sectors.includes(row.sector)) return false
      return !query || row.ticker.toLowerCase().includes(query) || row.name.toLowerCase().includes(query)
    })
  }, [rows, deferredSearch, markets, sectors])

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
    <section aria-label="Whitelisted securities" className="mt-12">
      <div className="table-toolbar">
        <InputGroup className="search-control">
          <InputGroupAddon><SearchIcon /></InputGroupAddon>
          <InputGroupInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ticker or company" aria-label="Search ticker or company" />
        </InputGroup>
        <div className="flex flex-wrap gap-3">
          <MultiSelectFilter label="Markets" options={marketOptions} selected={markets} onChange={setMarkets} />
          <MultiSelectFilter label="Sectors" options={sectorOptions} selected={sectors} onChange={setSectors} />
        </div>
      </div>

      <div className="data-table-shell">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted()
                    return (
                      <TableHead key={header.id} className={cn(["close_price", "change_pct", "volume"].includes(header.column.id) && "text-right")}>
                        {header.isPlaceholder ? null : (
                          <button type="button" className={cn("sort-button", ["close_price", "change_pct", "volume"].includes(header.column.id) && "ml-auto")} onClick={header.column.getToggleSortingHandler()}>
                            <table.FlexRender header={header} />
                            {sorted === "asc" ? <ArrowUpIcon /> : sorted === "desc" ? <ArrowDownIcon /> : <ArrowUpDownIcon />}
                          </button>
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
                  {row.getAllCells().map((cell) => <TableCell key={cell.id} className={cn(["close_price", "change_pct", "volume"].includes(cell.column.id) && "text-right")}><table.FlexRender cell={cell} /></TableCell>)}
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={columns.length} className="h-36 text-center text-muted-foreground">No securities match these filters.</TableCell></TableRow>
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
