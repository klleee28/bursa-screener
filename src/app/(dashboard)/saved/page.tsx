import { PageHeader } from "@/components/dashboard/page-header"
import { WhitelistTable } from "@/components/dashboard/whitelist-table"
import { getSavedTickerPageData } from "@/lib/data/queries"

export default async function SavedTickersPage() {
  const data = await getSavedTickerPageData()

  return (
    <div className="page-frame">
      <PageHeader
        title="Saved tickers"
        description="A focused shortlist from your policy-compliant universe."
        latestDate={data.latestDate}
        detail={`${data.rows.length} securities`}
      />
      {!data.savedFeatureReady ? (
        <section className="data-table-shell mt-12 px-6 py-10 text-sm leading-6 text-muted-foreground">
          Apply <code>202608260002_saved_tickers.sql</code> in the Supabase SQL Editor to activate saved tickers.
        </section>
      ) : (
        <WhitelistTable rows={data.rows} savedTickerIds={data.rows.map((row) => row.ticker)} mode="saved" />
      )}
    </div>
  )
}
