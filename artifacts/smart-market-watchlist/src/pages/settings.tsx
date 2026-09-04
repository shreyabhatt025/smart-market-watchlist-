import { BellRing, Check, ChevronRight, Info, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetWatchlistQueryKey, useGetWatchlist, useUpdateWatchlistSettings } from '@workspace/api-client-react';
import { formatPrice, timeAgo } from '@/lib/format';
import { EmptyState, LoadingRows, QueryError } from '@/components/market-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';

export function SettingsPage() {
  const client = useQueryClient();
  const watchlist = useGetWatchlist();
  const update = useUpdateWatchlistSettings();
  const [thresholds, setThresholds] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState('');
  useEffect(() => {
    if (watchlist.data?.items) setThresholds(Object.fromEntries(watchlist.data.items.map((item) => [item.symbol, String(item.thresholdPercent)])));
  }, [watchlist.data?.items]);
  function save(symbol: string) {
    const value = Number(thresholds[symbol]);
    if (!Number.isFinite(value) || value < 1 || value > 25) { setSaved(`Use a threshold between 1% and 25% for ${symbol}.`); return; }
    update.mutate({ symbol, data: { thresholdPercent: value } }, { onSuccess: () => { setSaved(`${symbol} will now surface at ${value}%.`); void client.invalidateQueries({ queryKey: getGetWatchlistQueryKey() }); }, onError: () => setSaved(`Could not update ${symbol}. Please try again.`) });
  }
  return <div className="mx-auto w-full max-w-[1060px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12"><div className="border-b border-border/70 pb-8"><p className="eyebrow text-primary">Desk preferences</p><h1 className="mt-3 font-display text-5xl tracking-[-.04em] sm:text-6xl">Set your signal<br /><em className="text-primary">sensitivity.</em></h1><p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">Thresholds are personal. They tell the attention desk how much movement is enough to earn your time, not what you should do next.</p></div>
    {saved && <div className="mt-6 flex items-center gap-2 rounded-lg bg-primary/8 px-4 py-3 text-sm text-primary" data-testid="status-settings-saved"><Check className="size-4" />{saved}</div>}
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
      <Card className="border-card-border p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-muted-foreground">Per-stock thresholds</p><h2 className="mt-2 text-xl font-semibold">When should we interrupt?</h2></div><BellRing className="size-5 text-accent" /></div><p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">We compare movement to your last checkpoint. A lower threshold means a more watchful desk.</p><div className="mt-7">{watchlist.isLoading ? <LoadingRows count={3} /> : watchlist.isError ? <QueryError onRetry={() => void watchlist.refetch()} /> : watchlist.data?.items?.length ? <div className="divide-y divide-border/70">{watchlist.data.items.map((item) => <div className="flex flex-col gap-4 py-5 first:pt-0 sm:flex-row sm:items-center sm:justify-between" key={item.symbol} data-testid={`row-setting-${item.symbol}`}><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-primary/8 font-data text-xs text-primary">{item.symbol.slice(0, 2)}</span><div><p className="font-semibold">{item.companyName}</p><p className="mt-1 text-xs text-muted-foreground">{item.symbol} · {item.exchange} · last checked {timeAgo(item.lastViewedAt)}</p></div></div><div className="flex items-center gap-2"><div className="relative"><Input type="number" min={1} max={25} step={0.5} value={thresholds[item.symbol] ?? item.thresholdPercent} onChange={(e) => setThresholds({ ...thresholds, [item.symbol]: e.target.value })} className="h-11 w-24 pr-8 font-data" aria-label={`${item.symbol} threshold percent`} data-testid={`input-threshold-${item.symbol}`} /><span className="absolute right-3 top-3 text-sm text-muted-foreground">%</span></div><Button onClick={() => save(item.symbol)} disabled={update.isPending} className="h-11" data-testid={`button-save-${item.symbol}`}>Save</Button></div></div>)}</div> : <EmptyState title="No watchlist items yet" body="Return to the attention desk and add a company to tune its threshold." />}</div></Card>
      <div className="space-y-6"><Card className="border-card-border bg-primary p-6 text-primary-foreground sm:p-7"><ShieldCheck className="size-6 text-accent" /><h2 className="mt-5 font-display text-3xl">Signal, not noise.</h2><p className="mt-3 text-sm leading-6 text-primary-foreground/75">A threshold is only one part of the read. We also consider market context, sector movement, volume, and the time since you last looked.</p></Card><Card className="border-card-border p-6 sm:p-7"><div className="flex gap-3"><Info className="mt-0.5 size-5 shrink-0 text-accent" /><div><h3 className="font-semibold">A note about stale data</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">If a source is delayed or the market is closed, we’ll say so clearly instead of presenting an old read as current.</p></div></div><Link href="/" className="focus-ring mt-5 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary" data-testid="link-settings-back">Back to attention desk <ChevronRight className="size-4" /></Link></Card></div>
    </div>
  </div>;
}