import { useEffect, useMemo, useRef, useState } from 'react'
import type { ApiResponse } from '../types'
import { analyzeMarket } from '../ai/analyzer'

type RiskLevel = 'low' | 'medium' | 'high' | undefined

const fmtUSD = (n?: number, d = 2) =>
  n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: d, maximumFractionDigits: d })
const fmtPct = (n?: number, d = 1) =>
  n == null ? '—' : `${n.toFixed(d)}%`

const riskColor = (lvl: RiskLevel) =>
  lvl === 'high' ? '#ef4444' : lvl === 'medium' ? '#f59e0b' : '#22c55e'

const riskLabel = (lvl: RiskLevel) =>
  (lvl ?? 'low').toUpperCase()

export function AIInsightPanel({
  market,
  side,
  data,
}: { market: string; side: 'LONG' | 'SHORT' | 'BOTH'; data: ApiResponse | null }) {
  const result = useMemo(() => (data ? analyzeMarket(market, side, data) : null), [market, side, data])

  // ---- Alerts
  const [alertsOn, setAlertsOn] = useState(false)
  const lastKeyRef = useRef<string>('')

  useEffect(() => {
    if (!alertsOn || !result) return
    const level = result.riskLevel as RiskLevel
    if (level === 'low') return

    const key = `${market}:${side}:${level}:${result.triggerRange?.low ?? ''}-${result.triggerRange?.high ?? ''}`
    if (key === lastKeyRef.current) return
    lastKeyRef.current = key

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        const title =
          level === 'high'
            ? `Risc ALT de liquidacions a ${market.toUpperCase()}`
            : `Risc MITJÀ de liquidacions a ${market.toUpperCase()}`
        const body = result.triggerRange
          ? `Rang a vigilar: ${fmtUSD(result.triggerRange.low, 4)} – ${fmtUSD(result.triggerRange.high, 4)}`
          : 'Hi ha posicions properes a liquidació.'
        new Notification(title, { body })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification(`Alertes activades per ${market.toUpperCase()}`, { body: 'T’avisarem si el risc puja.' })
          }
        })
      }
    }
  }, [alertsOn, result, market, side])

  return (
    <div className="card ai-panel">
      {/* Header */}
      <div className="spaced mb8 ai-header">
        <div className="ai-title">
          <span className="badge">IA</span>
          <h3>Anàlisi automàtica (rule-based)</h3>
        </div>

        {result && (
          <div className="ai-risk-pill" aria-label={`Risc ${riskLabel(result.riskLevel)}`} title={`Risc ${riskLabel(result.riskLevel)}`}>
            <span className="dot" style={{ background: riskColor(result.riskLevel as RiskLevel) }} />
            <strong style={{ color: riskColor(result.riskLevel as RiskLevel) }}>{riskLabel(result.riskLevel)}</strong>
            <span className="muted">· Puntuació {Math.round(result.riskScore)} / 100</span>
          </div>
        )}

        {/* <label className="ai-alerts">
          <input type="checkbox" checked={alertsOn} onChange={(e) => setAlertsOn(e.target.checked)} />
          <span className="muted">Alertes</span>
        </label> */}
      </div>

      {/* Gauge */}
      {result && (
        <div className="ai-gauge">
          <div className="track">
            <div
              className="fill"
              style={{
                width: `${Math.min(100, Math.max(0, Math.round(result.riskScore)))}%`,
                background: riskColor(result.riskLevel as RiskLevel),
              }}
            />
          </div>
          <div className="ai-gauge-legend muted">
            <span>LOW</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      {result && (
        <div className="ai-kpis">
          {/* Les següents propietats són opcionals: mostra només si hi són */}
          {'currentPrice' in result && (
            <div className="kpi">
              <div className="kpi-label">Preu estimat actual</div>
              <div className="kpi-value">{fmtUSD((result as any).currentPrice, 2)}</div>
            </div>
          )}
          {'lsRatio' in result && (
            <div className="kpi">
              <div className="kpi-label">Relació Long/Short</div>
              <div className="kpi-value">{(result as any).lsRatio}</div>
            </div>
          )}
          <div className="kpi">
            <div className="kpi-label">Lev. mitjà</div>
            <div className="kpi-value">{result.avgLev != null ? `${result.avgLev.toFixed(2)}x` : '—'}</div>
          </div>
          {'sentiment' in result && (
            <div className="kpi">
              <div className="kpi-label">Sentiment</div>
              <div className="kpi-value">{(result as any).sentiment}</div>
            </div>
          )}
          {result.triggerRange && (
            <div className="kpi kpi-span2">
              <div className="kpi-label">Rang objectiu</div>
              <div className="kpi-value">
                {fmtUSD(result.triggerRange.low, 4)} – {fmtUSD(result.triggerRange.high, 4)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resum */}
      {result ? (
        <div className="ai-summary">
          {/* El teu `summary` ja és ric en text; només el presentem polit */}
          <pre className="ai-summary-text">{result.summary}</pre>
        </div>
      ) : (
        <div className="muted">Carregant dades…</div>
      )}

      {/* Chips finals */}
      {result && (
        <div className="ai-chips">
          <span className="chip">Imminent: <strong>{fmtPct(result.wPctImminent)}</strong></span>
          <span className="chip">Near: <strong>{fmtPct(result.wPctNear)}</strong></span>
          <span className="chip">Lev mitjà: <strong>{result.avgLev?.toFixed(2)}x</strong></span>
        </div>
      )}
    </div>
  )
}
