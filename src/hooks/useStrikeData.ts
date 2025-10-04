import { useCallback, useEffect, useState } from 'react'
import type { ApiResponse } from '../types'
import { fetchStrike } from '../services/strikeApi'

export function useStrikeData() {
  const [market, setMarket] = useState<string>('ada')
  const [side, setSide] = useState<'LONG' | 'SHORT' | 'BOTH'>('BOTH')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchStrike({ market, side })
      setData(res)
    } catch {
      setError('No es pot carregar l\'API (CORS?). Fes servir el botó de "Carregar JSON".')
    } finally {
      setLoading(false)
    }
  }, [market, side])

  const onUpload = async (file: File) => {
    setError(null)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      setData(json)
    } catch {
      setError('JSON invàlid')
    }
  }

  useEffect(() => {
    load()
  }, [load])

  return { market, setMarket, side, setSide, loading, error, data, setData, search, setSearch, load, onUpload }
}
