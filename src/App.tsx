import { useMemo } from 'react'
import { useStrikeData } from './hooks/useStrikeData'
import { formatNum } from './lib/format'
import { StatCard } from './components/StatCard'
import { Controls } from './components/Controls'
import { LeaderboardTable } from './components/LeaderboardTable'
import { LiquidationMap } from './components/charts/LiquidationMap'
import { LeverageHistogram } from './components/charts/LeverageHistogram'
import { TopPNL } from './components/charts/TopPNL'
import { AIInsightPanel } from './components/AIInsightPanel'
import { TrendingUp, TrendingDown, BarChart3, Coins } from 'lucide-react'

export default function App() {
  const { market, setMarket, side, setSide, loading, error, data, search, setSearch, load, onUpload } = useStrikeData()

  const rows = useMemo(() => {
    const list = data?.LeaderBoards || []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (r) =>
        (r.Address?.ADAHandle || '').toLowerCase().includes(q) ||
        (r.Address?.Address || '').toLowerCase().includes(q)
    )
  }, [data, search])

  // Fallback per si l'API no torna Stats complets
  const fallbackAggs = useMemo(() => {
    const list = data?.LeaderBoards || []
    const longCount = list.filter((r) => r.Position?.Side === 'LONG').length
    const shortCount = list.filter((r) => r.Position?.Side === 'SHORT').length
    const avgLev = list.length
      ? list.reduce((a, b) => a + (b.Position?.Leverage || 0), 0) / list.length
      : 0
    const totalFees = list.reduce((a, b) => a + (b.Fees || 0), 0)
    const totalPNL = list.reduce((a, b) => a + (b.PNL?.[0] || 0), 0)
    const totalPNLforPool = -totalPNL;
    const longSize = list
      .filter((r) => r.Position?.Side === 'LONG')
      .reduce((a, b) => a + (b.TotalPositionSize?.TokenValueUsd || 0), 0)
    const shortSize = list
      .filter((r) => r.Position?.Side === 'SHORT')
      .reduce((a, b) => a + (b.TotalPositionSize?.TokenValueUsd || 0), 0)
    return { longCount, shortCount, avgLev, totalFees, totalPNL, longSize, shortSize, totalPNLforPool }
  }, [data])

  const stats = data?.Stats || {}

  return (
    <div className="wrap">
      <div className="container">
        {/* Header */}
        <div className="header">
          <div>
            <h1 className="title">Strike Finance – Estat del mercat</h1>
            <p className="muted">KPIs, mapes de liquidació, rànquings i anàlisi IA del risc.</p>
          </div>
        </div>

        {/* Controls */}
        <Controls
          market={market}
          setMarket={setMarket}
          side={side}
          setSide={setSide}
          search={search}
          setSearch={setSearch}
          onUpload={onUpload}
          onRefresh={load}
          loading={loading}
        />

        {error && <div className="card mt16" style={{ borderColor: '#7f1d1d', color: '#fecaca' }}>{error}</div>}

        {/* KPIs */}
        <div className="row cols-2 mt16">
          <StatCard
            label="Longs oberts"
            value={formatNum(stats.LongCount ?? fallbackAggs.longCount)}
            sub={formatNum(stats.LongSize ?? fallbackAggs.longSize, { style: 'currency', currency: 'USD' }) + ' mida'}
            icon={<TrendingUp size={16} />}
          />
          <StatCard
            label="Shorts oberts"
            value={formatNum(stats.ShortCount ?? fallbackAggs.shortCount)}
            sub={formatNum(stats.ShortSize ?? fallbackAggs.shortSize, { style: 'currency', currency: 'USD' }) + ' mida'}
            icon={<TrendingDown size={16} />}
          />
          <StatCard
            label="Apalancament mitjà"
            value={`${formatNum(stats.AverageLeverage ?? fallbackAggs.avgLev)}x`}
            sub={`ROE ${stats?.ROE != null ? (stats.ROE * 100).toFixed(2) : '-'}%`}
            icon={<BarChart3 size={16} />}
          />
          <StatCard
            icon={<Coins className="h-4 w-4"/>}
            label="PNL total (pool)"
            type="pool"
            value={formatNum(stats.totalPNLforPool ?? fallbackAggs.totalPNLforPool, { style: 'currency', currency: 'USD' })}
            sub={`Fees ${formatNum(stats.TotalFees ?? fallbackAggs.totalFees, { style: 'currency', currency: 'USD' })}`}
          />
        </div>

        {/* Charts */}
        <div className="row cols-1 mt16">
          <div style={{ gridColumn: 'span 2' }}>
            <LiquidationMap buckets={data?.LiquidationBuckets || []} avg={stats.LiquidationPriceAverage} />
          </div>
         
        </div>

        <div className="row cols-1 mt16">
           <LeverageHistogram rows={rows} />
        </div>

        <div className="row cols-1 mt16">
          {/* <div style={{ gridColumn: 'span 1' }}> */}
            <TopPNL rows={rows} />
          {/* </div> */}
        </div>

        <div className="row cols-1 mt16">
            <AIInsightPanel market={market} side={side} data={data} />
        </div>

        {/* Leaderboard */}
        <div className="mt16">
          <LeaderboardTable rows={rows} />
        </div>

        <div className="muted" style={{ textAlign: 'center', fontSize: 12, padding: '24px 0' }}>
          Dades: API pública de Bending – Strike Finance. Dashboard modular amb capa d'anàlisi automàtica de risc.
        </div>
      </div>
    </div>
  )
}
