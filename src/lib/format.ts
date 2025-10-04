export function formatNum(n: number | undefined, opts: Intl.NumberFormatOptions = {}) {
  if (n == null || Number.isNaN(n)) return '-'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, ...opts }).format(n)
}
export function secsToHHMM(secs?: number) {
  if (!secs && secs !== 0) return '-'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${h}h ${m}m`
}
