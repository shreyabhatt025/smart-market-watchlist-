import { Menu, Settings2, Signpost, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import type { User } from '@workspace/api-client-react';
import { Logo } from '@/components/market-ui';
import { Button } from '@/components/ui/button';

export function AppShell({ user, children }: { user?: User; children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = user?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'MW';
  const links = [{ href: '/', label: 'Attention desk', icon: Signpost }, { href: '/settings', label: 'Preferences', icon: Settings2 }];
  return <div className="min-h-[100dvh] lg:grid lg:grid-cols-[248px_1fr]">
    <aside className={`fixed inset-y-0 left-0 z-40 w-[248px] -translate-x-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : ''}`}>
      <div className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between"><Logo /><Button variant="ghost" size="icon" className="text-sidebar-foreground lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" data-testid="button-close-menu"><X /></Button></div>
        <div className="mt-14"><p className="eyebrow text-sidebar-foreground/50">Workspace</p><nav className="mt-3 space-y-1">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${location === href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon className="size-[17px]" />{label}</Link>)}</nav></div>
        <div className="mt-auto rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-4"><p className="eyebrow text-sidebar-foreground/50">Your rhythm</p><p className="mt-3 text-sm leading-6 text-sidebar-foreground/85">Check in when you have a moment. We’ll keep the noise out.</p></div>
        <div className="mt-4 flex items-center gap-3 border-t border-sidebar-border pt-4"><span className="grid size-9 place-items-center rounded-full bg-sidebar-primary font-data text-xs text-sidebar-primary-foreground">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{user?.name || 'Market watcher'}</p><p className="truncate text-xs text-sidebar-foreground/55">{user?.email || 'Personal desk'}</p></div></div>
      </div>
    </aside>
    {mobileOpen && <button className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-dismiss-menu" />}
    <main className="min-w-0">
      <header className="flex h-[72px] items-center justify-between border-b border-border/70 bg-background px-5 sm:px-8">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" data-testid="button-open-menu"><Menu /></Button>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-primary" />Personal market desk</div>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground"><span className="hidden sm:inline">Quietly keeping watch</span><span className="font-data text-[10px] uppercase tracking-[.14em]">Local time</span></div>
      </header>
      {children}
    </main>
  </div>;
}