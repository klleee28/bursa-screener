export function formatNumber(value: number | null) {
  return value == null ? "—" : new Intl.NumberFormat("en-MY").format(value)
}

export function formatPrice(value: number | null) {
  return value == null ? "—" : value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 3 })
}

export function formatPercent(value: number | null) {
  if (value == null) return "—"
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
}

export function formatEodDate(value: string | null) {
  if (!value) return "Awaiting first close"
  return new Intl.DateTimeFormat("en-MY", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}

export function formatCreatedDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}
