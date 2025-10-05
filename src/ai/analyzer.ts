import type { ApiResponse, LeaderboardRow } from '../types'
import { formatNum } from '../lib/format'

const IMMINENT_PCT = 0.02; // ≤2%
const NEAR_PCT = 0.07;     // ≤7%

function perRowCurrentPrice(r: LeaderboardRow): number | null {
  const markArr = Array.isArray(r.EntryMarkPrice) ? r.EntryMarkPrice : undefined
  const mark = (markArr?.length ? markArr[markArr.length - 1] : undefined)
  if (typeof mark === 'number' && isFinite(mark) && mark > 0) return mark

  const amt = r.CurrentPositionValue?.TokenValue?.Amount
  const usd = r.CurrentPositionValue?.TokenValueUsd
  if (amt && usd) {
    const p = usd / amt
    if (p > 0 && isFinite(p)) return p
  }

  const tokenP = r.Position?.Token?.Price
  if (typeof tokenP === 'number' && isFinite(tokenP) && tokenP > 0 && tokenP !== 1) return tokenP

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
  const allRows = data.LeaderBoards || []
  const rows = side === 'BOTH'
    ? allRows
    : allRows.filter(r => r.Position?.Side === side)

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

    // distància relativa fins liquidació (cap a la direcció que liquida)
    let d: number
    if (sideR === 'LONG') d = L >= p ? 0 : (p - L) / p
    else if (sideR === 'SHORT') d = L <= p ? 0 : (L - p) / p
    else return

    if (!isFinite(d) || d < 0 || d > 2) return

    countWithMetrics++
    const w = posSizeUsd(r)
    wTotal += w
    if (d <= IMMINENT_PCT) { imminent++; wImminent += w }
    else if (d <= NEAR_PCT) { near++; wNear += w }

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
  const riskScore = Math.max(0, Math.min(100, rawScore))
  const riskLevel: 'low' | 'medium' | 'high' = riskScore >= 35 ? (riskScore >= 60 ? 'high' : 'medium') : 'low'

  // Rang orientatiu de liquidacions (percentils)
  liqPrices.sort((a, b) => a - b)
  const p25 = percentile(liqPrices, 25)
  const p50 = percentile(liqPrices, 50)
  const p75 = percentile(liqPrices, 75)
  const triggerRange = (p25 && p50) ? { low: p25, high: p50 } : (p50 && p75 ? { low: p50, high: p75 } : undefined)

  // 🔎 opinió/guia per LPs
  let lpOpportunityLevel: 'low' | 'medium' | 'high' = 'low'
  if (riskLevel === 'high') lpOpportunityLevel = 'high'
  else if (riskLevel === 'medium') lpOpportunityLevel = 'medium'

  // si tenim rang i preu, matisem l’oportunitat segons proximitat
  if (lpOpportunityLevel !== 'low' && triggerRange && currentPrice) {
    const center = (triggerRange.low + triggerRange.high) / 2
    const dist = Math.abs(currentPrice - center) / currentPrice // distància relativa
    if (dist > 0.05) lpOpportunityLevel = lpOpportunityLevel === 'high' ? 'medium' : 'low'
  }

  // Missatges humans
  const priceStr = currentPrice ? formatNum(currentPrice, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }) : undefined

  let callout = ''
  if (riskLevel === 'high' && (triggerRange?.low || triggerRange?.high)) {
    const tgt = triggerRange.low ?? triggerRange?.high ?? (currentPrice ? currentPrice * 0.98 : undefined)
    callout = `⚠️ Risc elevat: es podrien produir liquidacions si el preu s’acosta a ${formatNum(tgt!, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 })}.`
  } else if (riskLevel === 'medium' && triggerRange) {
    callout = `Atenció: s’acumula risc de liquidacions a ${formatNum(triggerRange.low!, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 })} – ${formatNum(triggerRange.high!, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 })}.`
  } else {
    callout = `No s’esperen liquidacions imminents${priceStr ? ` al voltant de ${priceStr}` : ''}.`
  }

  let lpCallout = ''
  if (lpOpportunityLevel === 'high') {
    lpCallout = '💧 Oportunitat LPs: 🟢 Alta — Afegir liquiditat ara pot capturar recompenses de liquidacions si el preu es mou cap al rang objectiu.'
  } else if (lpOpportunityLevel === 'medium') {
    lpCallout = '💧 Oportunitat LPs: 🟡 Mitjana — Possible recompensa si hi ha retrocés cap al rang de triggers; afegeix gradualment.'
  } else {
    lpCallout = '💧 Oportunitat LPs: 🔴 Baixa — Escasses liquidacions probables a curt termini.'
  }

  const lines: string[] = []
  lines.push(`Mercat ${market.toUpperCase()} – costat ${side === 'BOTH' ? 'GLOBAL' : side}`)
  if (currentPrice) lines.push(`Preu estimat actual: ${formatNum(currentPrice, { style: 'currency', currency: 'USD' })}`)
  lines.push(`Relació Long/Short: ${formatNum(longCount)} / ${formatNum(shortCount)} | Lev. mitjà: ${formatNum(avgLev)}x | Sentiment: ${sentiment}.`)
  lines.push(`Risc (nombre): Imminent ≤2%: ${formatNum(pctImminent, { maximumFractionDigits: 1 })}% | Near 2–7%: ${formatNum(pctNear, { maximumFractionDigits: 1 })}%`)
  lines.push(`Risc (ponderat USD): Imminent: ${formatNum(wPctImminent, { maximumFractionDigits: 1 })}% | Near: ${formatNum(wPctNear, { maximumFractionDigits: 1 })}%`)
  lines.push(callout)
  lines.push(lpCallout)

  return {
    // bàsiques
    currentPrice,
    longCount, shortCount, avgLev, sentiment,
    // risc
    pctImminent, pctNear, wPctImminent, wPctNear, riskScore, riskLevel, triggerRange,
    // LP
    lpOpportunityLevel, lpCallout,
    // text
    summary: lines.join('\n'),
  }
}
