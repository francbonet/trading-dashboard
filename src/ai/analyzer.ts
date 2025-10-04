import type { ApiResponse, LeaderboardRow } from '../types'
import { formatNum } from '../lib/format'

function perRowCurrentPrice(r: LeaderboardRow): number | null {
  const mark = Array.isArray(r.EntryMarkPrice) && r.EntryMarkPrice.length
    ? r.EntryMarkPrice[r.EntryMarkPrice.length - 1]
    : undefined
  if (typeof mark === 'number' && mark > 0) return mark

  const amt = r.CurrentPositionValue?.TokenValue?.Amount
  const usd = r.CurrentPositionValue?.TokenValueUsd
  if (amt && usd) {
    const p = usd / amt
    if (p > 0 && isFinite(p)) return p
  }

  const tokenP = r.Position?.Token?.Price
  if (typeof tokenP === 'number' && tokenP > 0 && tokenP !== 1) return tokenP

  return null
}

function posSizeUsd(r: LeaderboardRow): number {
  return r.TotalPositionSize?.TokenValueUsd || 0
}

function percentile(sortedArr: number[], p: number) {
  if (!sortedArr.length) return undefined
  const idx = Math.min(sortedArr.length - 1, Math.max(0, Math.floor((p / 100) * (sortedArr.length - 1))))
  return sortedArr[idx]
}

export function analyzeMarket(market: string, side: 'LONG' | 'SHORT' | 'BOTH', data: ApiResponse) {
  const rows = data.LeaderBoards || []

  // Preu actual ponderat
  let wSum = 0, wPx = 0
  const perRowP: number[] = []
  rows.forEach((r) => {
    const p = perRowCurrentPrice(r)
    const w = posSizeUsd(r)
    perRowP.push(p ?? NaN)
    if (p && w > 0) { wSum += w; wPx += p * w }
  })
  const currentPrice = wSum > 0 ? wPx / wSum : undefined

  // Mètriques de risc
  let countWithMetrics = 0, near = 0, imminent = 0
  let wNear = 0, wImminent = 0, wTotal = 0
  const liqPrices: number[] = []

  rows.forEach((r, i) => {
    const p = perRowP[i] ?? currentPrice
    const L = r.LiquidationPrice
    const sideR = r.Position?.Side
    if (!p || !L || !isFinite(p) || !isFinite(L) || p <= 0 || L <= 0) return

    let d: number
    if (sideR === 'LONG') d = L >= p ? 0 : (p - L) / p
    else if (sideR === 'SHORT') d = L <= p ? 0 : (L - p) / p
    else return

    if (!isFinite(d) || d < 0 || d > 2) return

    countWithMetrics++
    const w = posSizeUsd(r)
    wTotal += w
    if (d <= 0.02) { imminent++; wImminent += w }
    else if (d <= 0.07) { near++; wNear += w }

    liqPrices.push(L)
  })

  const longCount = rows.filter(r => r.Position?.Side === 'LONG').length
  const shortCount = rows.filter(r => r.Position?.Side === 'SHORT').length
  const avgLev = rows.length ? rows.reduce((a, b) => a + (b.Position?.Leverage || 0), 0) / rows.length : 0
  const sentiment = longCount === shortCount ? 'Neutral' : longCount > shortCount ? 'Bullish (Long-heavy)' : 'Bearish (Short-heavy)'

  const pctImminent = countWithMetrics ? (imminent / countWithMetrics) * 100 : 0
  const pctNear = countWithMetrics ? (near / countWithMetrics) * 100 : 0
  const wPctImminent = wTotal ? (wImminent / wTotal) * 100 : 0
  const wPctNear = wTotal ? (wNear / wTotal) * 100 : 0

  // 🧮 puntuació de risc (0–100) combinant ponderat i no-ponderat
  const rawScore = (wPctImminent * 1.6 + wPctNear * 0.7 + pctImminent * 1.2 + pctNear * 0.5)
  const riskScore = Math.max(0, Math.min(100, rawScore)) // clamp
  const riskLevel: 'low' | 'medium' | 'high' = riskScore >= 35 ? (riskScore >= 60 ? 'high' : 'medium') : 'low'

  // Rang orientatiu on podria haver-hi liquidacions (percentils)
  liqPrices.sort((a, b) => a - b)
  const p25 = percentile(liqPrices, 25)
  const p50 = percentile(liqPrices, 50)
  const p75 = percentile(liqPrices, 75)
  const triggerRange = (p25 && p50) ? { low: p25, high: p50 } : (p50 && p75 ? { low: p50, high: p75 } : undefined)

  // Missatge final humà
  let callout = ''
  if (riskLevel === 'high' && (triggerRange?.low || triggerRange?.high)) {
    const tgt = triggerRange.low ?? triggerRange?.high ?? (currentPrice ? currentPrice * 0.98 : undefined)
    callout = `⚠️ Risc elevat: es podrien produir liquidacions si el preu s’acosta a ${formatNum(tgt, { maximumFractionDigits: 4 })}.`
  } else if (riskLevel === 'medium' && triggerRange) {
    callout = `Atenció: s’acumula risc de liquidacions al voltant de ${formatNum(triggerRange.low!, { maximumFractionDigits: 4 })} – ${formatNum(triggerRange.high!, { maximumFractionDigits: 4 })}.`
  } else {
    callout = `No s’esperen liquidacions imminents en el rang actual${currentPrice ? ` (≈ ${formatNum(currentPrice, { maximumFractionDigits: 4 })})` : ''}.`
  }

  const lines: string[] = []
  lines.push(`Mercat ${market.toUpperCase()} – costat ${side === 'BOTH' ? 'GLOBAL' : side}`)
  if (currentPrice) lines.push(`Preu estimat actual: ${formatNum(currentPrice)}$`)
  lines.push(`Relació Long/Short: ${formatNum(longCount)} / ${formatNum(shortCount)} | Lev. mitjà: ${formatNum(avgLev)}x | Sentiment: ${sentiment}.`)
  lines.push(`Risc (nombre): Imminent ≤2%: ${formatNum(pctImminent, { maximumFractionDigits: 1 })}% | Near 2–7%: ${formatNum(pctNear, { maximumFractionDigits: 1 })}%`)
  lines.push(`Risc (ponderat USD): Imminent: ${formatNum(wPctImminent, { maximumFractionDigits: 1 })}% | Near: ${formatNum(wPctNear, { maximumFractionDigits: 1 })}%`)
  lines.push(callout)

  return {
    currentPrice,
    longCount, shortCount, avgLev,
    pctImminent, pctNear, wPctImminent, wPctNear,
    riskScore, riskLevel, triggerRange,
    sentiment,
    summary: lines.join('\n'),
  }
}
