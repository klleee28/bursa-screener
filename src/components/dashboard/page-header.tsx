import { MarketDataRefresh } from "@/components/dashboard/market-data-refresh"
import { formatEodDate } from "@/lib/format"

export function PageHeader({ title, description, latestDate, detail }: { title: string; description: string; latestDate: string | null; detail?: string }) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
        {detail ? <p className="mt-4 text-sm font-medium text-muted-foreground">{detail}</p> : null}
      </div>
      <div className="flex flex-col items-start gap-3 sm:items-end">
        <p className="eod-date">EOD&nbsp;&nbsp;·&nbsp;&nbsp;{formatEodDate(latestDate)}</p>
        <MarketDataRefresh />
      </div>
    </header>
  )
}
