import { Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { getGetMarketWatchlistQueryKey, getGetWatchlistQueryKey, getSearchStocksQueryKey, useAddWatchlistItem, useGetMarketWatchlist, useGetWatchlist, useRemoveWatchlistItem, useSearchStocks } from '@workspace/api-client-react';
import type { StockSearchResult } from '@workspace/api-client-react';
import { AttentionCard, EmptyState, LoadingRows, MarketItemRow, MarketState, QueryError } from '@/components/market-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DashboardPage() {
  const client = useQueryClient();
  const watchlist = useGetWatchlist();
  const market = useGetMarketWatchlist();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const params = useMemo(() => ({ q: query.trim() }), [query]);
  const search = useSearchStocks(params, { query: { enabled: query.trim().length > 0, queryKey: getSearchStocksQueryKey(params) } });
  const add = useAddWatchlistItem();
  const remove = useRemoveWatchlistItem();
  const [notice, setNotice] = useState('');
  const isLoading = watchlist.isLoading || market.isLoading;
  const normalItems = (market.data?.items ?? []).filter((item) => !market.data?.attentionItems?.some((attention) => attention.symbol === item.symbol));

  function refresh() { void watchlist.refetch(); void market.refetch(); }
  function addItem(result: StockSearchResult) {
    add.mutate({ data: { symbol: result.symbol } }, {
      onSuccess: () => { setQuery(''); setSearchOpen(false); setNotice(`${result.symbol} added to your watchlist.`); void client.invalidateQueries({ queryKey: getGetWatchlistQueryKey() }); void client.invalidateQueries({ queryKey: getGetMarketWatchlistQueryKey() }); },
      onError: () => setNotice(`Could not add ${result.symbol}. Try again.`),
    });
  }
  function removeItem(symbol: string) {
    if (!window.confirm(`Remove ${symbol} from your watchlist?`)) return;
    remove.mutate({ symbol }, { onSuccess: () => { setNotice(`${symbol} removed.`); void client.invalidateQueries({ queryKey: getGetWatchlistQueryKey() }); void client.invalidateQueries({ queryKey: getGetMarketWatchlistQueryKey() }); } });
  }
  const error = watchlist.isError ? watchlist.error : market.error;
  return <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
    <div className="animate-rise flex flex-col justify-between gap-8 border-b border-border/70 pb-8 sm:flex-row sm:items-end"><div><p className="eyebrow text-primary">Thursday · attention desk</p><h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-.045em] sm:text-5xl lg:text-6xl">What deserves your attention?</h1><p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">A considered read of your watchlist, ranked by what changed since you last checked.</p></div><div className="flex flex-col items-start gap-3 sm:items-end"><MarketState state={market.data?.marketState} updatedAt={market.data?.updatedAt} stale={market.data?.items?.some((item) => item.isStale)} /><Button variant="outline" onClick={refresh} data-testid="button-refresh-market"><RefreshCw className="size-4" />Refresh read</Button></div></div>
     <div className="animate-rise animate-rise-1 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"><div className="relative max-w-lg flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input value={query} onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder="Add a stock by symbol or company" className="h-12 border-card-border bg-card pl-10" aria-label="Search stocks" data-testid="input-search-stocks" />{searchOpen && query.trim() && <div className="absolute inset-x-0 top-14 z-20 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">{search.isLoading ? <div className="p-4 text-sm text-muted-foreground">Looking through listed companies…</div> : search.data?.length ? search.data.slice(0, 5).map((result) => <button key={result.symbol} type="button" onClick={() => addItem(result)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left text-sm hover:bg-muted" data-testid={`button-add-${result.symbol}`}><span className="min-w-0 truncate"><span className="font-data text-primary">{result.symbol}</span><span className="ml-3 font-medium">{result.companyName}</span><span className="ml-2 text-xs text-muted-foreground">{result.exchange}</span></span><Plus className="size-4 shrink-0 text-primary" /></button>) : <div className="p-4 text-sm text-muted-foreground">No listed companies found for “{query}”.</div>}</div>}</div><Link href="/settings" className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-muted" data-testid="link-settings-from-dashboard"><SlidersHorizontal className="size-4" />Tune thresholds</Link></div>
    {notice && <button onClick={() => setNotice('')} className="mt-4 rounded-lg bg-primary/8 px-3 py-2 text-left text-xs text-primary" data-testid="status-dashboard-notice">{notice}</button>}
    {error ? <div className="mt-8"><QueryError onRetry={refresh} /></div> : isLoading ? <div className="mt-10"><LoadingRows count={3} /></div> : <div className="mt-10 space-y-12">
       <section className="animate-rise animate-rise-2"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="eyebrow text-accent-foreground/60">Ranked signal</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Worth a closer look</h2></div><span className="font-data text-xs text-muted-foreground">{market.data?.attentionItems?.length ?? 0} items</span></div>{market.data?.attentionItems?.length ? <div className="grid gap-3 lg:grid-cols-2">{market.data.attentionItems.map((item, index) => <AttentionCard item={item} rank={index + 1} key={item.symbol} />)}</div> : <EmptyState title="Nothing pressing right now" body="Your watchlist is within its normal range. We’ll surface a signal when the context changes." />}</section>
      <section className="animate-rise animate-rise-3"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="eyebrow text-muted-foreground">The wider read</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Normal watchlist</h2></div><span className="font-data text-xs text-muted-foreground">{normalItems.length} steady</span></div><div className="overflow-hidden rounded-xl border border-card-border bg-card"><div className="hidden grid-cols-[minmax(0,1fr)_100px_100px_86px] gap-5 border-b border-border/70 bg-muted/40 px-4 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground sm:grid"><span>Company</span><span>Last</span><span>Change</span><span /></div>{normalItems.length ? normalItems.map((item) => <MarketItemRow item={item} key={item.symbol} onRemove={removeItem} removing={remove.isPending && remove.variables?.symbol === item.symbol} />) : <div className="p-5"><EmptyState title="Your steady list is empty" body="Add another company to give your desk more context." /></div>}</div></section>
       <section className="rounded-xl border border-border/70 bg-primary px-5 py-6 text-primary-foreground sm:flex sm:items-center sm:justify-between sm:px-7"><div><p className="eyebrow text-primary-foreground/60">A note on the read</p><p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/85">Attention is a signal, not a recommendation. We surface meaningful changes since your last check — so you can decide what deserves a closer look.</p></div><span className="mt-5 block text-sm font-semibold uppercase tracking-[.12em] sm:mt-0">Understand first. Decide yourself.</span></section>
    </div>}
  </div>;
}