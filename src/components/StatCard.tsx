import { ReactNode } from 'react'

export function StatCard({ icon, label, value, sub, type }: { icon?: ReactNode; label: string; value: string | number; sub?: string, type?: string | undefined }) {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, ''))
  const valueColor = isNaN(numericValue)
    ? ''
    : numericValue > 0
    ? 'text-green-400'
    : numericValue < 0
    ? 'text-red-400'
    : ''

  return (
    <div className="card">
      <div className="kpi">
        <div>
          <div className="muted" style={{ fontSize: 12 }}>{label}</div>
          <div className={`value ${ type === 'pool' ? valueColor : ''}`}>{value}</div>
          {sub ? <div className="muted" style={{ fontSize: 12 }}>{sub}</div> : null}
        </div>
        {icon ? <div className="badge">{icon}</div> : null}
      </div>
    </div>
  )
}
