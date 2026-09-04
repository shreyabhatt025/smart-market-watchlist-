import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { login, register, setAuthTokenGetter } from '@workspace/api-client-react';
import { Logo } from '@/components/market-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function AuthLayout({ children, mode }: { children: ReactNode; mode: 'login' | 'register' }) {
  return <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[.85fr_1.15fr]">
    <div className="paper-grid relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col">
      <Logo />
      <div className="relative mt-auto max-w-md pb-10"><p className="eyebrow text-sidebar-primary">An attention system for patient investors</p><h1 className="mt-5 font-display text-6xl leading-[.95] tracking-[-.04em] text-sidebar-foreground">Know what<br /><em className="text-sidebar-primary">deserves</em><br />a closer look.</h1><p className="mt-7 max-w-sm text-sm leading-7 text-sidebar-foreground/65">Market Watchlist filters the movement from the noise, then tells you why it may matter since you last checked in.</p><div className="mt-12 flex items-center gap-3 text-xs text-sidebar-foreground/55"><span className="grid size-8 place-items-center rounded-full border border-sidebar-border"><Check className="size-4 text-sidebar-primary" /></span>Built for periodic watchers, not day traders.</div></div>
      <div className="absolute -right-28 top-1/3 size-72 rounded-full border border-sidebar-primary/20" /><div className="absolute -right-12 top-[38%] size-40 rounded-full border border-sidebar-primary/20" />
    </div>
    <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-20 lg:py-12"><div className="lg:hidden"><Logo /></div><div className="m-auto w-full max-w-[430px]">{children}<p className="mt-8 text-center text-sm text-muted-foreground">{mode === 'login' ? <>New here? <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/register" data-testid="link-register">Create your desk</Link></> : <>Already have a desk? <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/login" data-testid="link-login">Sign in</Link></>}</p></div></div>
  </div>;
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const isRegister = mode === 'register';
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if ((isRegister && form.name.trim().length < 2) || !form.email || form.password.length < 8) { setError(isRegister ? 'Add your name, a valid email, and a password of at least 8 characters.' : 'Enter a valid email and password of at least 8 characters.'); return; }
    setPending(true);
    try {
      const response = isRegister ? await register({ name: form.name.trim(), email: form.email.trim(), password: form.password }) : await login({ email: form.email.trim(), password: form.password });
      localStorage.setItem('market-watchlist-token', response.token);
      setAuthTokenGetter(() => localStorage.getItem('market-watchlist-token'));
      setLocation('/');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'We could not sign you in. Please try again.'); } finally { setPending(false); }
  }
  return <AuthLayout mode={mode}><div className="animate-rise"><p className="eyebrow text-primary">{isRegister ? 'Start your desk' : 'Welcome back'}</p><h2 className="mt-4 font-display text-5xl leading-none tracking-[-.04em]">{isRegister ? 'A calmer way to keep watch.' : 'Return to your watch.'}</h2><p className="mt-5 text-sm leading-6 text-muted-foreground">{isRegister ? 'Set up a personal market read that respects your attention.' : 'Your latest attention read is waiting.'}</p>
    <form onSubmit={submit} className="mt-9 space-y-4">
      {isRegister && <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Your name</span><div className="relative"><UserRound className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input autoComplete="name" className="h-12 pl-10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Maya Chen" data-testid="input-name" /></div></label>}
      <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Email</span><div className="relative"><Mail className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input type="email" autoComplete="email" className="h-12 pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" data-testid="input-email" /></div></label>
      <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Password</span><div className="relative"><LockKeyhole className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} className="h-12 pl-10 pr-12" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" data-testid="input-password" /><button type="button" className="absolute right-1 top-1 grid size-10 place-items-center rounded-md text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} data-testid="button-toggle-password">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label>
      {error && <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" role="alert" data-testid="status-auth-error">{error}</p>}
      <Button type="submit" className="mt-3 h-12 w-full" disabled={pending} data-testid="button-submit-auth">{pending ? 'Opening your desk…' : isRegister ? 'Create my watchlist' : 'Sign in'}<ArrowRight className="size-4" /></Button>
    </form></div></AuthLayout>;
}