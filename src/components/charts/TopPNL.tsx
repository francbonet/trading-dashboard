import { useMemo } from 'react'
import type { LeaderboardRow } from '../../types'
import { formatNum } from '../../lib/format'
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from 'recharts'

export function TopPNL({ rows }: { rows: LeaderboardRow[] }) {
  const series = useMemo(() => {
    return (rows || [])
      .map((r) => ({
        name: r.Address?.ADAHandle || r.Address?.Address?.slice(0, 8) + '…',
        pnl: r.PNL?.[0] || 0,
        side: r.Position?.Side,
      }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 20)
  }, [rows])

  return (
    <div className="card">
      <div className="spaced mb8">
        <h3 style={{ fontSize: 14, margin: 0 }}>Top PNL (USD)</h3>
        <span className="badge">Top 20</span>
      </div>
      <div className="h64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series}>
            <CartesianGrid stroke="#2a2f3a" strokeDasharray="3 3" />
            <XAxis dataKey="name" hide tick={{ fill: '#cbd5e1' }} axisLine={{ stroke: '#2a2f3a' }} />
            <YAxis tick={{ fill: '#cbd5e1' }} axisLine={{ stroke: '#2a2f3a' }} />
            <Tooltip
              contentStyle={{ background: '#0f1117', border: '1px solid #2a2f3a', color: '#e5e7eb' }}
              formatter={(v: any) => formatNum(v, { style: 'currency', currency: 'USD' })}
            />
            <Bar dataKey="pnl">
              {/* 👇 verd per PNL >0, vermell per <0 */}
              {series.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? '#22c55e' : '#ef4444'} stroke={d.pnl >= 0 ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
