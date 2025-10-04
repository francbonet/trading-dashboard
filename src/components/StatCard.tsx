import { ReactNode } from 'react'

export function StatCard({ icon, label, value, sub }: { icon?: ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <div className="kpi">
        <div>
          <div className="muted" style={{ fontSize: 12 }}>{label}</div>
          <div className="value">{value}</div>
          {sub ? <div className="muted" style={{ fontSize: 12 }}>{sub}</div> : null}
        </div>
        {icon ? <div className="badge">{icon}</div> : null}
      </div>
    </div>
  )
}
