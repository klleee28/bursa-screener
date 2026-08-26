export default function DashboardLoading() {
  return (
    <div className="page-frame" aria-label="Loading page" aria-busy="true">
      <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-md bg-muted" />
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-muted" />)}
      </div>
      <div className="mt-12 h-96 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
