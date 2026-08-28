"use client"

import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export type CsvColumn<Row> = {
  header: string
  value: (row: Row) => unknown
}

function escapeCsvCell(value: unknown) {
  let text = value == null ? "" : String(value)

  // Prevent spreadsheet applications from evaluating imported text as a formula.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`

  return `"${text.replaceAll('"', '""')}"`
}

function localDateStamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function CsvExportButton<Row>({
  rows,
  columns,
  filename,
}: {
  rows: readonly Row[]
  columns: readonly CsvColumn<Row>[]
  filename: string
}) {
  function handleExport() {
    if (!rows.length) return

    const header = columns.map((column) => escapeCsvCell(column.header)).join(",")
    const body = rows.map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(","))
    const csv = `\uFEFF${[header, ...body].join("\r\n")}`
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")

    link.href = url
    link.download = `${filename}-${localDateStamp()}.csv`
    link.hidden = true
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <Button type="button" variant="outline" size="lg" onClick={handleExport} disabled={!rows.length}>
      <DownloadIcon data-icon="inline-start" />
      Export CSV
    </Button>
  )
}
