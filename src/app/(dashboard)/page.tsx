import { PageHeader } from "@/components/dashboard/page-header"
import { WhitelistTable } from "@/components/dashboard/whitelist-table"
import { getDashboardData } from "@/lib/data/queries"

export default async function DashboardPage() {
  const data = await getDashboardData()
  return (
    <div className="page-frame">
      <PageHeader title="Investment universe" description="Ordinary shares that pass your policy rules." latestDate={data.latestDate} />
      <section aria-label="Universe metrics" className="metric-rail">
        <div><p>Total tracked</p><strong>{data.totalTracked.toLocaleString("en-MY")}</strong></div>
        <div><p>Blacklisted</p><strong className="text-destructive">{data.blacklisted.toLocaleString("en-MY")}</strong></div>
        <div><p>Whitelisted</p><strong>{data.whitelisted.toLocaleString("en-MY")}</strong></div>
      </section>
      <WhitelistTable rows={data.rows} savedTickerIds={data.savedTickerIds} savedFeatureReady={data.savedFeatureReady} />
    </div>
  )
}
