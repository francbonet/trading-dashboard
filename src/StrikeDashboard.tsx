import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, UploadCloud, TrendingUp, TrendingDown, BarChart3, Timer, Coins, Search, Brain } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid, PieChart, Pie, Cell } from "recharts";

/**
 * Strike Finance – Market Dashboard (modular + IA layer)
 *
 * ✅ Components separats (en un sol fitxer per a demo)  
 * ✅ Capa d'"IA" local (rule‑based) que analitza risc de liquidació i sentiment del mercat  
 * ✅ Tailwind + shadcn/ui + recharts
 * ✅ Fetch per mercat + side OR càrrega d'un data.json local
 *
 * Per a multi-fitxer real, copia cada "bloc // --- File: ..." al seu corresponent arxiu.
 */

// -----------------------------
// ---- File: src/types.ts
// -----------------------------

const DEV_API_BASE  = 'https://api.bending.ai/defi/strikefinance';
const PROD_API_BASE = 'https://nameless-wood-1c17.francbonet.workers.dev/defi/strikefinance'; // ⬅️ posa la teva URL del Worker
const API_BASE = import.meta.env.DEV ? DEV_API_BASE : PROD_API_BASE

export type TokenValue = {
  TokenKey: string;
  TokenName: string;
  Amount: number;
  Price: number; // assumim que és preu actual del token
  Value: number;
  Image: string;
};

export type Position = {
  Status: string; // "Active" | "Closed" etc
  Side: "LONG" | "SHORT";
  Token: TokenValue; // conté Price
  Leverage: number;
};

export type LeaderboardRow = {
  Version: string;
  Tx: { Time: number; Tx: string };
  Market: string;
  EnteredPositionTime: number;
  Address: { Address: string; StakeAddress: string; ADAHandle?: string };
  Portfolio: { TotalBalance: number; Protocols?: { Protocol: string; Value: number }[] };
  Position: Position;
  CurrentPositionValue: { TokenValue: TokenValue; TokenValueUsd: number };
  TotalPositionSize: { TokenValue: TokenValue; TokenValueUsd: number };
  Fees: number;
  UsdHourlyRate: number;
  EntryMarkPrice: number[]; // [entry, mark?] segons API
  LiquidationPrice: number;
  Collateral: number;
  CollateralToken: number;
  CollateralTokenKey: string;
  TakeProfitStoploss: number[];
  PNL: number[]; // [usd, %?]
  Value: number; // token amount (current)
  DurationInSeconds: number;
};

export type Stats = {
  AverageLeverage: number;
  TotalCollateral: number;
  AverageCollateral: number;
  TotalFees: number;
  AveragePNL: number;
  AverageDuration: number;
  TotalPNL: number;
  LongCount: number;
  ShortCount: number;
  LongPlayer: number;
  ShortPlayer: number;
  LiquidationPriceAverage: number;
  TotalPositionSize: number;
  LongSize: number;
  ShortSize: number;
  ROE: number;
  AccountValue: number;
  Wins: number;
  Liquidated24H: number;
};

export type LiquidationBucket = {
  Range: [number, number];
  LongVolume: number;
  ShortVolume: number;
  LongCumulative: number;
  ShortCumulative: number;
};

export type ApiResponse = {
  LeaderBoards: LeaderboardRow[];
  Stats: Partial<Stats>;
  LiquidationBuckets: LiquidationBucket[];
  Page: number;
  PerPage: number;
  TotalItem: number;
  TotalParticipants: number;
};

// -----------------------------
// ---- File: src/lib/format.ts
// -----------------------------

function formatNum(n: number | undefined, opts: Intl.NumberFormatOptions = {}) {
  if (n == null || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, ...opts }).format(n);
}

function formatADA(n: number | undefined) {
  if (n == null) return "-";
  return `${formatNum(n)} ADA`;
}

function secsToHHMM(secs?: number) {
  if (!secs && secs !== 0) return "-";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

// -----------------------------
// ---- File: src/services/strikeApi.ts
// -----------------------------

async function fetchStrike({ market, side }: { market: string; side: "LONG" | "SHORT" | "BOTH" }): Promise<ApiResponse> {
  const params = new URLSearchParams({
    type: side === "BOTH" ? "LONG" : side,
    sort_by: "PNL",
    order: "desc",
    position_type: "leaderboard_view",
    market,
  });

  if (side !== "BOTH") {
    const res = await fetch(`${API_BASE}?${params.toString()}`);
    return res.json();
  }

  const base = Object.fromEntries(params);
  const [longRes, shortRes] = await Promise.all([
    fetch(`${API_BASE}?${new URLSearchParams({ ...base, type: "LONG" })}`),
    fetch(`${API_BASE}?${new URLSearchParams({ ...base, type: "SHORT" })}`),
  ]);
  const [L, S] = await Promise.all([longRes.json(), shortRes.json()]);

  const merged: ApiResponse = {
    ...L,
    LeaderBoards: [...(L.LeaderBoards || []), ...(S.LeaderBoards || [])],
    Stats: {
      ...L.Stats,
      LongCount: L.Stats?.LongCount ?? 0,
      ShortCount: S.Stats?.ShortCount ?? 0,
      LongSize: L.Stats?.LongSize ?? 0,
      ShortSize: S.Stats?.ShortSize ?? 0,
      TotalPositionSize: (L.Stats?.LongSize || 0) + (S.Stats?.ShortSize || 0),
    },
    LiquidationBuckets: L.LiquidationBuckets || [],
  };
  return merged;
}

// -----------------------------
// ---- File: src/ai/analyzer.ts (IA RULE-BASED)
// -----------------------------

type RiskBucket = "IMMINENT" | "NEAR" | "COMFORT";

function analyzeMarket(market: string, side: "LONG" | "SHORT" | "BOTH", data: ApiResponse) {
  const rows = data.LeaderBoards || [];
  // estimació de preu actual del subyacente (agafem mitjana de Position.Token.Price si existeix)
  const prices = rows.map(r => r.Position?.Token?.Price).filter((p): p is number => typeof p === "number" && !Number.isNaN(p));
  const currentPrice = prices.length ? prices.reduce((a,b)=>a+b,0)/prices.length : undefined;

  const sizeUsd = (r: LeaderboardRow) => r.TotalPositionSize?.TokenValueUsd || 0;

  // Distància a liquidació relativa per posició
  function distanceToLiqRel(r: LeaderboardRow): number | null {
    const p = currentPrice ?? r.Position?.Token?.Price;
    const L = r.LiquidationPrice;
    if (!p || !L) return null;
    if (r.Position?.Side === "LONG") {
      return (p - L) / p; // < 0.05 => molt a prop de liquidació
    } else {
      return (L - p) / p; // < 0.05 => molt a prop de liquidació per short
    }
  }

  let total = 0, near = 0, imminent = 0;
  let wNear = 0, wImminent = 0, wTotal = 0;

  rows.forEach(r => {
    const d = distanceToLiqRel(r);
    if (d == null) return;
    total++;
    const w = sizeUsd(r);
    wTotal += w;
    if (d <= 0.02) { // <=2% del preu
      imminent++;
      wImminent += w;
    } else if (d <= 0.07) { // 2–7%
      near++;
      wNear += w;
    }
  });

  const longCount = rows.filter(r=>r.Position?.Side==="LONG").length;
  const shortCount = rows.filter(r=>r.Position?.Side==="SHORT").length;
  const avgLev = rows.length ? rows.reduce((a,b)=> a + (b.Position?.Leverage || 0), 0) / rows.length : 0;

  const sentiment = longCount === shortCount ? "Neutral" : (longCount > shortCount ? "Bullish (Long-heavy)" : "Bearish (Short-heavy)");

  // Conclusió textual
  const messages: string[] = [];
  messages.push(`Mercat ${market.toUpperCase()} – costat ${side === "BOTH" ? "GLOBAL" : side}`);
  if (currentPrice) messages.push(`Preu estimat actual: ${formatNum(currentPrice)}$`);
  messages.push(`Relació Long/Short: ${formatNum(longCount)} / ${formatNum(shortCount)} | Lev. mitjà: ${formatNum(avgLev)}x | Sentiment: ${sentiment}.`);

  const pctImminent = total ? (imminent/total)*100 : 0;
  const pctNear = total ? (near/total)*100 : 0;
  const wPctImminent = wTotal ? (wImminent/wTotal)*100 : 0;
  const wPctNear = wTotal ? (wNear/wTotal)*100 : 0;

  messages.push(`Risc de liquidació (per nombre de posicions): IMMINENT ≤2%: ${formatNum(pctImminent,{maximumFractionDigits:1})}% | NEAR 2–7%: ${formatNum(pctNear,{maximumFractionDigits:1})}%.`);
  messages.push(`Risc ponderat per mida (USD): IMMINENT: ${formatNum(wPctImminent,{maximumFractionDigits:1})}% | NEAR: ${formatNum(wPctNear,{maximumFractionDigits:1})}%.`);

  let callout = "Risc controlat";
  if (wPctImminent > 8 || pctImminent > 10) callout = "ALERTA: moltes posicions properes a liquidació";
  else if (wPctNear > 15 || pctNear > 20) callout = "Atenció: acumulació de posicions a 2–7%";

  messages.push(callout);

  return {
    currentPrice,
    longCount,
    shortCount,
    avgLev,
    pctImminent,
    pctNear,
    wPctImminent,
    wPctNear,
    sentiment,
    summary: messages.join(""),
  };
}

// -----------------------------
// ---- File: src/hooks/useStrikeData.ts
// -----------------------------

function useStrikeData() {
  const [market, setMarket] = useState<string>("ada");
  const [side, setSide] = useState<"LONG" | "SHORT" | "BOTH">("BOTH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStrike({ market, side });
      setData(res);
    } catch (e) {
      setError("No es pot carregar l'API (CORS?). Carrega el teu JSON local.");
    } finally {
      setLoading(false);
    }
  }, [market, side]);

  const onUpload = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setData(json);
    } catch (e) {
      setError("JSON invàlid");
    }
  };

  useEffect(() => { load(); }, [load]);

  return { market, setMarket, side, setSide, loading, error, data, setData, search, setSearch, load, onUpload };
}

// -----------------------------
// ---- File: src/components/StatCard.tsx
// -----------------------------

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
            {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
          </div>
          <div className="rounded-2xl p-2 border">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------
// ---- File: src/components/Controls.tsx
// -----------------------------

function Controls({ market, setMarket, side, setSide, search, setSearch, onUpload, onRefresh, loading }:{
  market: string; setMarket: (v:string)=>void;
  side: "LONG"|"SHORT"|"BOTH"; setSide: (v:"LONG"|"SHORT"|"BOTH")=>void;
  search: string; setSearch: (v:string)=>void;
  onUpload: (file: File)=>void;
  onRefresh: ()=>void;
  loading: boolean;
}){
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Select value={market} onValueChange={setMarket}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Mercat" />
        </SelectTrigger>
        <SelectContent>
          {['ada','min','strike','wmtx','iag','btc'].map(m => (
            <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Tabs value={side} onValueChange={(v:any)=>setSide(v as any)} className="col-span-2">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="LONG">LONG</TabsTrigger>
          <TabsTrigger value="SHORT">SHORT</TabsTrigger>
          <TabsTrigger value="BOTH">BOTH</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground"/>
        <Input placeholder="Buscar address o handle" value={search} onChange={(e: any)=>setSearch(e.target.value)} />
      </div>

      <div className="md:col-span-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
            Actualitzar
          </Button>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input type="file" accept="application/json" className="hidden" onChange={(e)=> e.target.files && onUpload(e.target.files[0])} />
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border">
              <UploadCloud className="h-4 w-4"/> Carregar JSON
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// ---- File: src/components/charts/LiquidationMap.tsx
// -----------------------------

function LiquidationMap({ buckets, avg }:{ buckets: LiquidationBucket[]; avg?: number }){
  const series = useMemo(()=> (buckets||[]).map(b=>({
    label: `${b.Range[0].toFixed(3)}–${b.Range[1].toFixed(3)}`,
    long: b.LongVolume,
    short: b.ShortVolume,
  })), [buckets]);

  return (
    <Card className="col-span-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Mapa de liquidacions (volum per rang)</h3>
          {avg!=null && <Badge variant="outline">Liq. mitjana: {formatNum(avg)}</Badge>}
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: 8, right: 8, top: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="lgLong" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopOpacity={0.4} />
                  <stop offset="95%" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" hide/>
              <YAxis />
              <Tooltip formatter={(v:any, n:any) => [formatNum(v), n]} />
              <Area type="monotone" dataKey="long" strokeWidth={2} fillOpacity={1} fill="url(#lgLong)" />
              <Area type="monotone" dataKey="short" strokeWidth={2} fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------
// ---- File: src/components/charts/LeverageHistogram.tsx
// -----------------------------

function LeverageHistogram({ rows }:{ rows: LeaderboardRow[] }){
  const series = useMemo(()=>{
    const hist: Record<string, number> = {};
    (rows||[]).forEach(r=>{
      const l = Math.round((r.Position?.Leverage || 0) * 2) / 2; // 0.5x buckets
      hist[l] = (hist[l] || 0) + 1;
    });
    return Object.entries(hist).map(([k,v])=>({ lev: parseFloat(k), count: v })).sort((a,b)=>a.lev-b.lev);
  },[rows]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Distribució d'apalancament</h3>
          <Timer className="h-4 w-4 text-muted-foreground"/>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="lev" tickFormatter={(v)=>v+"x"} />
              <YAxis />
              <Tooltip formatter={(v:any)=>formatNum(v)} labelFormatter={(l:any)=>`${l}x`} />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------
// ---- File: src/components/charts/TopPNL.tsx
// -----------------------------

function TopPNL({ rows }:{ rows: LeaderboardRow[] }){
  const series = useMemo(()=>{
    return (rows||[]).map(r=>({
      name: r.Address?.ADAHandle || r.Address?.Address?.slice(0,8)+"…",
      pnl: r.PNL?.[0] || 0,
      side: r.Position?.Side,
    })).sort((a,b)=> Math.abs(b.pnl)-Math.abs(a.pnl)).slice(0,20);
  },[rows]);

  return (
    <Card className="col-span-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Top PNL (USD)</h3>
          <Badge variant="secondary">Top 20</Badge>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip formatter={(v:any)=>formatNum(v, { style:'currency', currency:'USD' })} />
              <Bar dataKey="pnl" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------
// ---- File: src/components/LeaderboardTable.tsx
// -----------------------------

function LeaderboardTable({ rows }:{ rows: LeaderboardRow[] }){
  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 flex items-center justify-between">
          <h3 className="text-sm font-medium">Leaderboard de posicions</h3>
          <span className="text-xs text-muted-foreground">{rows.length} files</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left border-t">
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-2">Trader</th>
                <th className="px-3 py-2">Side</th>
                <th className="px-3 py-2">Lev</th>
                <th className="px-3 py-2">Tamaño (USD)</th>
                <th className="px-3 py-2">Valor actual (USD)</th>
                <th className="px-3 py-2">PNL (USD)</th>
                <th className="px-3 py-2">Liq.</th>
                <th className="px-3 py-2">Duració</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{r.Address?.ADAHandle || r.Address?.Address?.slice(0,10)+"…"}</span>
                      <span className="text-xs text-muted-foreground">{r.Address?.Address?.slice(0, 20)}…</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={r.Position?.Side === 'LONG' ? 'default' : 'secondary'}>{r.Position?.Side}</Badge>
                  </td>
                  <td className="px-3 py-2">{formatNum(r.Position?.Leverage)}x</td>
                  <td className="px-3 py-2">{formatNum(r.TotalPositionSize?.TokenValueUsd, { style:'currency', currency:'USD' })}</td>
                  <td className="px-3 py-2">{formatNum(r.CurrentPositionValue?.TokenValueUsd, { style:'currency', currency:'USD' })}</td>
                  <td className="px-3 py-2">{formatNum(r.PNL?.[0], { style:'currency', currency:'USD' })}</td>
                  <td className="px-3 py-2">{formatNum(r.LiquidationPrice)}</td>
                  <td className="px-3 py-2">{secsToHHMM(r.DurationInSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------
// ---- File: src/components/AIInsightPanel.tsx
// -----------------------------

function AIInsightPanel({ market, side, data }:{ market: string; side: "LONG"|"SHORT"|"BOTH"; data: ApiResponse | null }){
  const result = useMemo(()=> data ? analyzeMarket(market, side, data) : null, [market, side, data]);
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4"/>
          <h3 className="text-sm font-medium">Anàlisi IA (rule‑based)</h3>
        </div>
        {result ? (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {result.summary}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Carregant dades…</div>
        )}
        {result && (
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Imminent: {formatNum(result.wPctImminent,{maximumFractionDigits:1})}% (ponderat)</Badge>
            <Badge variant="outline">Near: {formatNum(result.wPctNear,{maximumFractionDigits:1})}%</Badge>
            <Badge variant="outline">Lev mitjà: {formatNum(result.avgLev)}x</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -----------------------------
// ---- File: src/App.tsx (entry)
// -----------------------------

export default function StrikeDashboard() {
  const { market, setMarket, side, setSide, loading, error, data, search, setSearch, load, onUpload } = useStrikeData();

  const rows = useMemo(() => {
    const list = data?.LeaderBoards || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      (r.Address?.ADAHandle || "").toLowerCase().includes(q) ||
      (r.Address?.Address || "").toLowerCase().includes(q)
    );
  }, [data, search]);

  // Fallback stats (si no ve prou info al payload)
  const fallbackAggs = useMemo(() => {
    const list = data?.LeaderBoards || [];
    const longCount = list.filter((r) => r.Position?.Side === "LONG").length;
    const shortCount = list.filter((r) => r.Position?.Side === "SHORT").length;
    const avgLev = list.length ? list.reduce((a, b) => a + (b.Position?.Leverage || 0), 0) / list.length : 0;
    const totalFees = list.reduce((a, b) => a + (b.Fees || 0), 0);
    const totalPNL = list.reduce((a, b) => a + (b.PNL?.[0] || 0), 0);
    const totalPNLforPool = totalPNL;

    const longSize = list.filter(r=>r.Position?.Side==="LONG").reduce((a,b)=>a + (b.TotalPositionSize?.TokenValueUsd||0),0);
    const shortSize = list.filter(r=>r.Position?.Side==="SHORT").reduce((a,b)=>a + (b.TotalPositionSize?.TokenValueUsd||0),0);
    return { longCount, shortCount, avgLev, totalFees, totalPNL, longSize, shortSize };
  }, [data]);

  const stats = data?.Stats || {};

  return (
    <div className="w-full min-h-screen p-6 bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Strike Finance – Estat del mercat</h1>
            <p className="text-muted-foreground">KPIs, mapes de liquidació, rànquings i anàlisi IA del risc.</p>
          </div>
          <div className="opacity-70 text-xs">Demo modular (1 fitxer)</div>
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

        {error && (
          <div className="p-4 rounded-md border bg-destructive/10 text-destructive">{error}</div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={<TrendingUp className="h-4 w-4"/>} label="Longs oberts" value={formatNum(stats.LongCount ?? fallbackAggs.longCount)} sub={formatNum(stats.LongSize ?? fallbackAggs.longSize, { style: 'currency', currency: 'USD' }) + ' mida'} />
          <StatCard icon={<TrendingDown className="h-4 w-4"/>} label="Shorts oberts" value={formatNum(stats.ShortCount ?? fallbackAggs.shortCount)} sub={formatNum(stats.ShortSize ?? fallbackAggs.shortSize, { style: 'currency', currency: 'USD' }) + ' mida'} />
          <StatCard icon={<BarChart3 className="h-4 w-4"/>} label="Apalancament mitjà" value={`${formatNum(stats.AverageLeverage ?? fallbackAggs.avgLev)}x`} sub={`ROE ${(stats?.ROE!=null)? formatNum((stats.ROE||0)*100):'-'}%`} />
          <StatCard icon={<Coins className="h-4 w-4"/>} label="PNL total" value={formatNum(stats.TotalPNL ?? fallbackAggs.totalPNL, { style: 'currency', currency: 'USD' })} sub={`Fees ${formatNum(stats.TotalFees ?? fallbackAggs.totalFees, { style: 'currency', currency: 'USD' })}`} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <LiquidationMap buckets={data?.LiquidationBuckets||[]} avg={stats.LiquidationPriceAverage} />
          <LeverageHistogram rows={rows} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TopPNL rows={rows} />
          <AIInsightPanel market={market} side={side} data={data} />
        </div>

        {/* Leaderboard */}
        <LeaderboardTable rows={rows} />

        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center py-6">
          Dades: API pública de Bending – Strike Finance. Dashboard modular amb capa d'anàlisi automàtica de risc.
        </div>
      </div>
    </div>
  );
}
