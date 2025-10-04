import { useMemo } from 'react'
import type { LiquidationBucket } from '../../types'
import { formatNum } from '../../lib/format'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export function LiquidationMap({ buckets, avg }: { buckets: LiquidationBucket[]; avg?: number }) {
  const series = useMemo(
    () =>
      (buckets || []).map((b) => ({
        label: `${b.Range[0].toFixed(3)}–${b.Range[1].toFixed(3)}`,
        long: b.LongVolume,
        short: b.ShortVolume,
      })),
    [buckets]
  )

  return (
    <div className="card">
      <div className="spaced mb8">
        <h3 style={{ fontSize: 14, margin: 0 }}>Mapa de liquidacions (volum per rang)</h3>
        {avg != null && <span className="badge">Liq. mitjana: {formatNum(avg)}</span>}
      </div>
      <div className="h64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ left: 8, right: 8, top: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="lgLong" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopOpacity={0.4} />
                <stop offset="95%" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" hide />
            <YAxis />
            <Tooltip formatter={(v: any, n: any) => [formatNum(v), n]} />
            <Area type="monotone" dataKey="long" strokeWidth={2} fillOpacity={1} fill="url(#lgLong)" />
            <Area type="monotone" dataKey="short" strokeWidth={2} fillOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
