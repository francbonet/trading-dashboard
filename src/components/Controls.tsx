import { ChangeEvent } from 'react'
import { RefreshCw, UploadCloud } from 'lucide-react'

export function Controls({
  market,
  setMarket,
  side,
  setSide,
  search,
  setSearch,
  onUpload,
  onRefresh,
  loading,
}: {
  market: string
  setMarket: (v: string) => void
  side: 'LONG' | 'SHORT' | 'BOTH'
  setSide: (v: 'LONG' | 'SHORT' | 'BOTH') => void
  search: string
  setSearch: (v: string) => void
  onUpload: (file: File) => void
  onRefresh: () => void
  loading: boolean
}) {
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onUpload(f)
  }

  return (
    <>
      <div className="controls">
        <select value={market} onChange={(e) => setMarket(e.target.value)} className="input">
          {['ada', 'snek','min', 'strike', 'wmtx', 'iag', 'btc'].map((m) => (
            <option key={m} value={m}>{m.toUpperCase()}</option>
          ))}
        </select>

        <div className="tabbar">
          {(['LONG', 'SHORT', 'BOTH'] as const).map((v) => (
            <button key={v} className={side === v ? 'active' : ''} onClick={() => setSide(v)}>{v}</button>
          ))}
        </div>

        <input className="input" placeholder="Buscar address o handle" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="spaced mt16">
        <button className="btn" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={16} /> Actualitzar
        </button>
        <label className="btn" style={{ cursor: 'pointer' }}>
          <UploadCloud size={16} /> Carregar JSON
          <input type="file" accept="application/json" style={{ display: 'none' }} onChange={handleFile} />
        </label>
      </div>
    </>
  )
}
