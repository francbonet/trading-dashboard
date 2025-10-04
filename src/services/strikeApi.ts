// src/services/strikeApi.ts
import type { ApiResponse } from '../types'

const DEV_API_BASE  = 'https://api.bending.ai/defi/strikefinance';
const PROD_API_BASE = 'https://nameless-wood-1c17.francbonet.workers.dev/defi/strikefinance' // << CANVIA-HO
const API_BASE = import.meta.env.DEV ? DEV_API_BASE : PROD_API_BASE

function qs(params: Record<string, string>) {
  return new URLSearchParams(params).toString()
}

async function fetchJSON<T = any>(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<T> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} ${res.statusText} · ${text.slice(0, 180)}`)
    }
    return (await res.json()) as T
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error(`Timeout després de ${timeoutMs}ms: ${url}`)
    throw e
  } finally {
    clearTimeout(t)
  }
}

export async function fetchStrike({
  market,
  side,
}: {
  market: string
  side: 'LONG' | 'SHORT' | 'BOTH'
}): Promise<ApiResponse> {
  const baseParams = {
    sort_by: 'PNL',
    order: 'desc',
    position_type: 'leaderboard_view',
    market,
  }

  if (side !== 'BOTH') {
    const url = `${API_BASE}?${qs({ ...baseParams, type: side })}`
    return fetchJSON<ApiResponse>(url)
  }

  // BOTH → LONG + SHORT en paral·lel
  const [L, S] = await Promise.all([
    fetchJSON<ApiResponse>(`${API_BASE}?${qs({ ...baseParams, type: 'LONG' })}`),
    fetchJSON<ApiResponse>(`${API_BASE}?${qs({ ...baseParams, type: 'SHORT' })}`),
  ])

  // Merge i ordenació global per PNL desc
  const mergedLeaderboards = [
    ...(L.LeaderBoards ?? []),
    ...(S.LeaderBoards ?? []),
  ].sort((a, b) => (b.PNL?.[0] ?? 0) - (a.PNL?.[0] ?? 0))

  const merged: ApiResponse = {
    ...L, // fem servir L de base per l’estructura
    LeaderBoards: mergedLeaderboards,
    Stats: {
      ...L.Stats,
      LongCount: L.Stats?.LongCount ?? 0,
      ShortCount: S.Stats?.ShortCount ?? 0,
      LongSize: L.Stats?.LongSize ?? 0,
      ShortSize: S.Stats?.ShortSize ?? 0,
      TotalPositionSize: (L.Stats?.LongSize || 0) + (S.Stats?.ShortSize || 0),
    },
    LiquidationBuckets: L.LiquidationBuckets || [],
    Page: 1,
    PerPage: 0,
    TotalItem: 0,
    TotalParticipants: 0,
  }

  return merged
}
