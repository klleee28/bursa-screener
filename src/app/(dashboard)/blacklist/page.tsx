import { BlacklistForm } from "@/components/blacklist/blacklist-form"
import { BlacklistTable } from "@/components/blacklist/blacklist-table"
import { PageHeader } from "@/components/dashboard/page-header"
import { getBlacklistPageData } from "@/lib/data/queries"

export default async function BlacklistPage() {
  const data = await getBlacklistPageData()
  return (
    <div className="page-frame">
      <PageHeader title="Policy exclusions" description="Remove stocks that do not meet your Trading Policy Statement." latestDate={data.latestDate} detail={`${data.entries.length} securities`} />
      <div className="mt-9">
        <BlacklistForm master={data.master} entries={data.entries} />
        <BlacklistTable entries={data.entries} />
      </div>
    </div>
  )
}
