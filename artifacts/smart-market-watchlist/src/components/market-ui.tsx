import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, CircleHelp, Minus, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { Link } from 'wouter';
import type { Attention, MarketItem, Signal } from '@workspace/api-client-react';
import { formatDate, formatPercent, formatPrice, timeAgo, titleCase } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function Logo() {
  return <Link href="/" className="focus-ring flex items-center gap-3" data-testid="link-home">
    <span className="relative grid size-9 place-items-center rounded-full bg-accent text-foreground">
      <span className="absolute h-4 w-px rotate-45 bg-foreground/70" />
      <span className="absolute h-px w-4 rotate-45 bg-foreground/70" />
      <span className="relative size-1.5 rounded-full bg-foreground" />
    </span>
    <span className="font-semibold tracking-[-.03em]">Market Watchlist</span>
  </Link>;
}

export function SeverityPill({ severity, acknowledged = false }: { severity?: string; acknowledged?: boolean }) {
  const normalized = (severity ?? '').toLowerCase();
  const tone = acknowledged ? 'bg-muted text-muted-foreground' : normalized.includes('high') || normalized.includes('critical')
    ? 'bg-destructive/10 text-destructive' : normalized.includes('medium') || normalized.includes('watch')
      ? 'bg-accent/20 text-foreground' : 'bg-primary/10 text-primary';
  return <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.13em] ${tone}`}>
    <span className={`size-1.5 rounded-full ${acknowledged ? 'bg-muted-foreground/60' : normalized.includes('high') || normalized.includes('critical') ? 'bg-destructive' : normalized.includes('medium') || normalized.includes('watch') ? 'bg-accent' : 'bg-primary'}`} />
    {acknowledged ? 'Acknowledged' : titleCase(severity) }
  </span>;
}

export function ChangeValue({ value, className = '' }: { value: number | null | undefined; className?: string }) {
  const positive = (value ?? 0) > 0;
  const neutral = value === 0 || value === null || value === undefined;
  return <span className={`font-data text-sm font-medium ${neutral ? 'text-muted-foreground' : positive ? 'text-primary' : 'text-destructive'} ${className}`}>
    {neutral ? <Minus className="mr-1 inline size-3" /> : positive ? <ArrowUpRight className="mr-1 inline size-3" /> : <ArrowDownRight className="mr-1 inline size-3" />}
    {formatPercent(value)}
  </span>;
}

export function MarketState({ state, updatedAt, stale = false }: { state?: string; updatedAt?: string; stale?: boolean }) {
  const closed = state?.toLowerCase().includes('closed') || state?.toLowerCase().includes('halt');
  return <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" data-testid="status-market-state">
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${closed ? 'border-border bg-muted' : 'border-primary/25 bg-primary/5 text-primary'}`}>
      <span className={`size-1.5 rounded-full ${closed ? 'bg-muted-foreground' : 'live-mark bg-primary'}`} />
      {closed ? 'Market closed' : 'Market open'}
    </span>
    {stale && <span className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1.5 text-foreground">Data is stale</span>}
    {updatedAt && <span>Updated {timeAgo(updatedAt)}</span>}
  </div>;
}

export function ScoreRing({ score, compact = false }: { score: number; compact?: boolean }) {
  const radius = compact ? 19 : 27;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.min(100, Math.max(0, score)) / 100 * circumference;
  return <div className={`relative shrink-0 ${compact ? 'size-12' : 'size-16'}`} aria-label={`Attention score ${score}`}>
    <svg className="-rotate-90" viewBox="0 0 68 68">
      <circle cx="34" cy="34" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
      <circle cx="34" cy="34" r={radius} fill="none" stroke="hsl(var(--accent))" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} />
    </svg>
    <span className={`absolute inset-0 grid place-items-center font-data font-medium ${compact ? 'text-xs' : 'text-sm'}`}>{Math.round(score)}</span>
  </div>;
}

export function AttentionCard({ item, rank }: { item: MarketItem; rank: number }) {
  return <Link href={`/stocks/${item.symbol}`} className="focus-ring group block" data-testid={`card-attention-${item.symbol}`}>
    <Card className="relative h-full overflow-hidden border-card-border bg-card shadow-none transition-colors duration-200 group-hover:border-accent/60 group-hover:bg-card">
      <div className="absolute inset-y-0 left-0 w-1 bg-accent" />
      <div className="flex h-full gap-4 p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex flex-col items-center gap-2">
          <span className="font-data text-[10px] text-muted-foreground">0{rank}</span>
          <ScoreRing score={item.attention.score} compact />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><span className="font-data text-xs font-medium tracking-[.04em] text-primary">{item.symbol}</span><h3 className="mt-1 truncate text-[15px] font-semibold tracking-[-.02em]">{item.companyName}</h3></div>
            <SeverityPill severity={item.attention.severity} />
          </div>
          <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-muted-foreground">{item.attention.explanation?.explanation || 'A meaningful move since your last check deserves a closer look.'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            <span className="font-data">Since check <ChangeValue value={item.attention.sinceLastCheckPercent} /></span>
            <span>{timeAgo(item.attention.sinceLastCheckAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  </Link>;
}

export function MarketItemRow({ item, onRemove, removing }: { item: MarketItem; onRemove?: (symbol: string) => void; removing?: boolean }) {
  return <div className="group grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border/70 px-4 py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_100px_100px_86px] sm:gap-5" data-testid={`row-watchlist-${item.symbol}`}>
    <Link href={`/stocks/${item.symbol}`} className="focus-ring min-w-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/8 font-data text-[11px] font-medium text-primary">{item.symbol.slice(0, 2)}</span>
        <span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.companyName}</span><span className="font-data text-[11px] text-muted-foreground">{item.symbol} · {item.exchange}</span></span>
      </div>
    </Link>
    <span className="hidden font-data text-sm sm:block">{formatPrice(item.price)}</span>
    <ChangeValue value={item.changePercent} />
    <div className="flex justify-end">
      {onRemove && <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => onRemove(item.symbol)} disabled={removing} aria-label={`Remove ${item.symbol}`} data-testid={`button-remove-${item.symbol}`}><X className="size-4" /></Button>}
    </div>
  </div>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
    <div><CircleHelp className="mx-auto mb-3 size-6 text-accent" /><h3 className="font-semibold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>{action && <div className="mt-4">{action}</div>}</div>
  </div>;
}

export function QueryError({ onRetry, message = 'We could not bring in the latest market read.' }: { onRetry?: () => void; message?: string }) {
  return <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-6" role="alert"><div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 size-5 text-destructive" /><div><h3 className="font-semibold">A quiet moment in the data</h3><p className="mt-1 text-sm text-muted-foreground">{message}</p>{onRetry && <Button variant="outline" className="mt-4" onClick={onRetry} data-testid="button-retry"><RefreshCw className="size-4" />Try again</Button>}</div></div></div>;
}

export function LoadingRows({ count = 4 }: { count?: number }) {
  return <div className="space-y-3">{Array.from({ length: count }).map((_, index) => <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-card p-4" key={index}><Skeleton className="size-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-2/3" /></div><Skeleton className="h-8 w-16" /></div>)}</div>;
}

export function SignalBars({ signals }: { signals: Signal[] }) {
  return <div className="space-y-3">{signals.length ? signals.map((signal) => <div key={`${signal.type}-${signal.label}`} className="grid grid-cols-[1fr_auto] gap-4"><div><div className="flex items-center justify-between gap-3 text-sm"><span>{signal.label}</span><span className="font-data text-xs text-muted-foreground">{signal.contribution > 0 ? '+' : ''}{signal.contribution.toFixed(1)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.abs(signal.contribution) * 10)}%` }} /></div></div><span className="font-data text-xs text-muted-foreground">{signal.available === false ? 'N/A' : typeof signal.value === 'number' ? signal.value.toFixed(1) : '—'}</span></div>) : <p className="text-sm text-muted-foreground">No contributing signals are available for this read.</p>}</div>;
}

export function ExplanationBlock({ item }: { item: MarketItem }) {
  const explanation = item.attention.explanation;
  return <div className="space-y-4">
     <div className="rounded-xl bg-primary/6 p-4"><p className="eyebrow text-primary">Why this surfaced</p><p className="mt-3 text-sm leading-6">{explanation?.explanation || 'There is not enough context to explain this movement yet.'}</p></div>
    <dl className="divide-y divide-border/70 rounded-xl border border-border/70">
      {[['Fact', explanation?.fact], ['Signal', explanation?.signal], ['Context', explanation?.context], ['Source', explanation?.source]].map(([label, value]) => <div className="grid gap-1 p-4 sm:grid-cols-[90px_1fr] sm:gap-4" key={label}><dt className="eyebrow text-muted-foreground">{label}</dt><dd className="text-sm leading-6">{value || 'Unavailable'}</dd></div>)}
    </dl>
    {explanation?.unknown && <p className="flex gap-2 text-xs leading-5 text-muted-foreground"><CircleHelp className="mt-0.5 size-3.5 shrink-0" />{explanation.unknown}</p>}
  </div>;
}