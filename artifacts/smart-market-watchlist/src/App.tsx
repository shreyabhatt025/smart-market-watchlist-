import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getGetMeQueryKey, setAuthTokenGetter, useGetMe } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { AppShell } from '@/components/app-shell';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthPage } from '@/pages/auth';
import { DashboardPage } from '@/pages/dashboard';
import NotFound from '@/pages/not-found';
import { SettingsPage } from '@/pages/settings';
import { StockDetailPage } from '@/pages/stock-detail';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  const [location, setLocation] = useLocation();
  const me = useGetMe({ query: { enabled: !location.startsWith('/login') && !location.startsWith('/register'), queryKey: getGetMeQueryKey() } });
  useEffect(() => {
    if (me.isError && !location.startsWith('/login') && !location.startsWith('/register')) setLocation('/login');
  }, [me.isError, location, setLocation]);
  const isAuth = location === '/login' || location === '/register';
  if (!isAuth && me.isLoading) return <div className="grid min-h-[100dvh] place-items-center bg-background"><div className="w-full max-w-sm px-6"><div className="h-2 w-24 animate-pulse rounded-full bg-accent/60" /><div className="mt-4 h-8 w-72 animate-pulse rounded bg-muted" /><div className="mt-3 h-4 w-56 animate-pulse rounded bg-muted" /></div></div>;
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/login"><AuthPage mode="login" /></Route>
        <Route path="/register"><AuthPage mode="register" /></Route>
        <Route path="/"><AppShell user={me.data}><DashboardPage /></AppShell></Route>
        <Route path="/stocks/:symbol"><AppShell user={me.data}><StockDetailPage /></AppShell></Route>
        <Route path="/settings"><AppShell user={me.data}><SettingsPage /></AppShell></Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  setAuthTokenGetter(() => localStorage.getItem('market-watchlist-token'));
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
