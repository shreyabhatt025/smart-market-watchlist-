import { ArrowLeft, Check, Clock3, ExternalLink, Info, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'wouter';
import { getGetEventQueryKey, getGetMarketWatchlistQueryKey, getGetStockDetailQueryKey, useAcknowledgeEvent, useGetEvent, useGetStockDetail, useUpdateStockCheckpoint } from '@workspace/api-client-react';
import { ChangeValue, EmptyState, ExplanationBlock, LoadingRows, MarketState, QueryError, ScoreRing, SeverityPill, SignalBars } from '@/components/market-ui';
import { formatDate, formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function StockDetailPage() {
  const { symbol = '' } = useParams<{ symbol: string }>();
  const normalizedSymbol = symbol.toUpperCase();
  const client = useQueryClient();
  const detail = useGetStockDetail(normalizedSymbol, { query: { queryKey: getGetStockDetailQueryKey(normalizedSymbol) } });
  const eventId = detail.data?.item.activeEventId ?? '';
  const event = useGetEvent(eventId, { query: { enabled: Boolean(eventId), queryKey: getGetEventQueryKey(eventId) } });
  const checkpoint = useUpdateStockCheckpoint();
  const acknowledge = useAcknowledgeEvent();
  const [notice, setNotice] = useState('');
  const item = detail.data?.item;
  if (detail.isLoading) return <div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8"><LoadingRows count={4} /></div>;
  if (detail.isError || !item || !detail.data) return <div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8"><Link href="/" className="focus-ring inline-flex items-center gap-2 text-sm text-muted-foreground" data-testid="link-back-dashboard"><ArrowLeft className="size-4" />Back to attention desk</Link><div className="mt-8"><QueryError onRetry={() => void detail.refetch()} message="This stock read could not be loaded right now." /></div></div>;
  const acknowledged = event.data?.status?.toLowerCase() === 'acknowledged' || Boolean(event.data?.acknowledgedAt);
  function markChecked() {
    checkpoint.mutate({ symbol: normalizedSymbol }, { onSuccess: (data) => { setNotice(`Checkpoint updated at ${formatPrice(data.lastCheckpointPrice)}.`); void client.invalidateQueries({ queryKey: getGetStockDetailQueryKey(normalizedSymbol) }); void client.invalidateQueries({ queryKey: getGetMarketWatchlistQueryKey() }); }, onError: () => setNotice('We could not update your checkpoint. Try again.') });
  }
  function acknowledgeSignal() {
    if (!eventId) return;
    acknowledge.mutate({ id: eventId }, { onSuccess: () => { setNotice('Signal acknowledged.'); void client.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) }); void client.invalidateQueries({ queryKey: getGetStockDetailQueryKey(normalizedSymbol) }); }, onError: () => setNotice('We could not acknowledge this signal yet.') });
  }
  return <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
    <Link href="/" className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-dashboard"><ArrowLeft className="size-4" />Back to attention desk</Link>
    <div className="mt-7 flex flex-col justify-between gap-6 border-b border-border/70 pb-8 md:flex-row md:items-end"><div><div className="flex flex-wrap items-center gap-3"><span className="font-data text-sm font-medium text-primary">{item.symbol}</span><span className="text-xs text-muted-foreground">{item.exchange} · {item.sector || 'Sector unavailable'}</span></div><h1 className="mt-3 text-4xl font-bold tracking-[-.045em] sm:text-5xl lg:text-6xl">{item.companyName}</h1><div className="mt-4 flex flex-wrap items-center gap-3"><MarketState state={item.marketState} stale={item.isStale} /><span className="text-xs text-muted-foreground">Observed {formatDate(item.observedAt)}</span></div></div><div className="flex w-full flex-wrap gap-3 md:w-auto md:flex-nowrap"><Button variant="outline" className="flex-1 md:flex-none" onClick={markChecked} disabled={checkpoint.isPending} data-testid="button-update-checkpoint"><RotateCcw className="size-4" />{checkpoint.isPending ? 'Updating…' : 'Mark as checked'}</Button>{eventId && <Button className="flex-1 md:flex-none" onClick={acknowledgeSignal} disabled={acknowledge.isPending || acknowledged} data-testid="button-acknowledge-event">{acknowledged ? <Check className="size-4" /> : null}{acknowledged ? 'Acknowledged' : 'Acknowledge'}</Button>}</div></div>
    {notice && <div className="mt-4 rounded-lg bg-primary/8 px-3 py-2 text-sm text-primary" data-testid="status-stock-notice">{notice}</div>}
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <Card className="overflow-hidden border-card-border"><div className="flex items-start justify-between gap-5 border-b border-border/70 bg-card p-6 sm:p-8"><div><p className="eyebrow text-muted-foreground">Since your last check</p><div className="mt-4 flex items-end gap-3"><span className="font-data text-4xl font-medium"><ChangeValue value={item.attention.sinceLastCheckPercent} /></span></div><p className="mt-3 text-sm text-muted-foreground">{item.attention.sinceLastCheckAt ? `Last looked ${formatDate(item.attention.sinceLastCheckAt)}` : 'This is your first recorded check.'}</p></div><ScoreRing score={item.attention.score} /></div><div className="grid grid-cols-2 divide-x divide-border/70 p-6 sm:p-8"><div><p className="eyebrow text-muted-foreground">Current price</p><p className="mt-2 font-data text-xl">{formatPrice(item.price)}</p><p className="mt-1"><ChangeValue value={item.changePercent} /></p></div><div className="pl-6"><p className="eyebrow text-muted-foreground">Versus market</p><p className="mt-2 font-data text-xl"><ChangeValue value={item.marketChangePercent} /></p><p className="mt-1 text-xs text-muted-foreground">Market move</p></div></div></Card>
      <Card className="border-card-border p-6 sm:p-8"><div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow text-muted-foreground">Signal anatomy</p><h2 className="mt-2 text-xl font-semibold">What shaped the score</h2></div><SeverityPill severity={item.attention.severity} acknowledged={acknowledged} /></div><div className="mt-7"><SignalBars signals={item.attention.signals} /></div></Card>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <Card className="border-card-border p-6 sm:p-8"><p className="eyebrow text-muted-foreground">Structured explanation</p><h2 className="mt-2 text-xl font-semibold">The useful context</h2><div className="mt-6"><ExplanationBlock item={item} /></div></Card>
      <Card className="border-card-border p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="eyebrow text-muted-foreground">Your history</p><h2 className="mt-2 text-xl font-semibold">Timeline</h2></div><Clock3 className="size-5 text-accent" /></div><div className="mt-6">{detail.data.timeline?.length ? <div className="relative ml-2 space-y-6 border-l border-border pl-6">{detail.data.timeline.map((entry, index) => <div className="relative" key={`${entry.timestamp}-${index}`}><span className="absolute -left-[31px] top-1.5 size-2.5 rounded-full border-2 border-background bg-accent" /><p className="font-data text-[10px] uppercase tracking-[.12em] text-muted-foreground">{formatDate(entry.timestamp)}</p><p className="mt-1 text-sm font-semibold">{entry.label}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.detail}</p></div>)}</div> : <EmptyState title="No timeline yet" body="Your next check-in will give this stock a reference point." />}</div></Card>
    </div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/35 px-5 py-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><Info className="size-4" />Data from {item.source || 'market source'} · {item.isStale ? 'stale' : 'current'}</span>{event.data?.explanation?.source && <span className="flex items-center gap-1">Event source <ExternalLink className="size-3" /></span>}</div>
  </div>;
}