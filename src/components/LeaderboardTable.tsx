import type { LeaderboardRow } from '../types'
import { secsToDHMM, formatNum } from '../lib/format'

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="spaced" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>Leaderboard de posicions</h3>
        <span className="muted" style={{ fontSize: 12 }}>{rows.length} files</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Trader</th>
              <th>Side</th>
              <th>Lev</th>
              <th className="right">Tamaño (USD)</th>
              <th className="right">Valor actual (USD)</th>
              <th className="right">PNL (USD)</th>
              <th className="right">Liq.</th>
              <th>Duració</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.Address?.ADAHandle || r.Address?.Address?.slice(0, 10) + '…'}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{r.Address?.Address?.slice(0, 20)}…</div>
                  </div>
                </td>
                <td><span className="badge"  style={{
                  backgroundColor: r.Position?.Side?.toUpperCase() === 'LONG' ? '#e6ffed' : '#ffe6e6',
                  color: r.Position?.Side?.toUpperCase() === 'LONG' ? '#0a0' : '#c00',
                  fontWeight: 600,
                }}>{r.Position?.Side}</span></td>
                <td>{formatNum(r.Position?.Leverage)}x</td>
                <td className="right">{formatNum(r.TotalPositionSize?.TokenValueUsd, { style: 'currency', currency: 'USD' })}</td>
                <td className="right">{formatNum(r.CurrentPositionValue?.TokenValueUsd, { style: 'currency', currency: 'USD' })}</td>
                <td className="right" style={{
                  color: r.PNL?.[0] > 0 ? '#22c55e' : r.PNL?.[0] < 0 ? '#ef4444' : 'inherit',
                  fontWeight: 600,
                }}>{formatNum(r.PNL?.[0], { style: 'currency', currency: 'USD' })}</td>
                <td className="right">{formatNum(r.LiquidationPrice)}</td>
                <td>{secsToDHMM(r.DurationInSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
