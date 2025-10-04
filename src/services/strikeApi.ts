import type { ApiResponse } from '../types'

const API_BASE = 'https://api.bending.ai/defi/strikefinance' as const

export async function fetchStrike({
  market,
  side,
}: {
  market: string
  side: 'LONG' | 'SHORT' | 'BOTH'
}): Promise<ApiResponse> {
  const params = new URLSearchParams({
    type: side === 'BOTH' ? 'LONG' : side,
    sort_by: 'PNL',
    order: 'desc',
    position_type: 'leaderboard_view',
    market,
  })
  if (side !== 'BOTH') {
    const res = await fetch(`${API_BASE}?${params.toString()}`)
    return res.json()
  }
  const base = Object.fromEntries(params)
  const [longRes, shortRes] = await Promise.all([
    fetch(`${API_BASE}?${new URLSearchParams({ ...base, type: 'LONG' })}`),
    fetch(`${API_BASE}?${new URLSearchParams({ ...base, type: 'SHORT' })}`),
  ])
  const [L, S] = await Promise.all([longRes.json(), shortRes.json()])
  return {
    ...L,
    LeaderBoards: [...(L.LeaderBoards || []), ...(S.LeaderBoards || [])],
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
  } as ApiResponse
}
