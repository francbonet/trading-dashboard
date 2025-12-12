export function formatNum(n: number | undefined, opts: Intl.NumberFormatOptions = {}) {
  if (n == null || Number.isNaN(n)) return '-'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4, ...opts }).format(n)
}
export function secsToDHMM(secs?: number) {
  if (!secs && secs !== 0) return '-'
  
  const totalHours = Math.floor(secs / 3600)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = Math.floor((secs % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  return `${hours}h ${minutes}m`
}
