import { useMemo } from 'react'
import type { LeaderboardRow } from '../../types'
import { formatNum } from '../../lib/format'
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts'

export function LeverageHistogram({ rows }: { rows: LeaderboardRow[] }) {
  const series = useMemo(() => {
    const hist: Record<string, number> = {}
    ;(rows || []).forEach((r) => {
      const l = Math.round((r.Position?.Leverage || 0) * 2) / 2 // 0.5x buckets
      hist[l] = (hist[l] || 0) + 1
    })
    return Object.entries(hist)
      .map(([k, v]) => ({ lev: parseFloat(k), count: v }))
      .sort((a, b) => a.lev - b.lev)
  }, [rows])

  return (
    <div className="card">
      <div className="mb8"><h3 style={{ fontSize: 14, margin: 0 }}>Distribució d'apalancament</h3></div>
      <div className="h64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series}>
            <CartesianGrid stroke="#2a2f3a" strokeDasharray="3 3" />
            <XAxis dataKey="lev" tickFormatter={(v) => v + 'x'} tick={{ fill: '#cbd5e1' }} axisLine={{ stroke: '#2a2f3a' }} />
            <YAxis tick={{ fill: '#cbd5e1' }} axisLine={{ stroke: '#2a2f3a' }} />
            <Tooltip
              contentStyle={{ background: '#0f1117', border: '1px solid #2a2f3a', color: '#e5e7eb' }}
              formatter={(v: any) => formatNum(v)}
              labelFormatter={(l: any) => `${l}x`}
            />
            {/* 👇 color clar per a barres en tema fosc */}
            <Bar dataKey="count" stroke="#60a5fa" fill="#60a5fa" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
