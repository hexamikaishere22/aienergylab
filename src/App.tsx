import { type ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Calculator from '@/pages/Calculator';
import Home from '@/pages/Home';
import Learn from '@/pages/Learn';
import Simulator from '@/pages/Simulator';
import { EnergyProvider } from '@/lib/EnergyContext';
import News from '@/pages/News';
import { Shell } from '@/components/Shell';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { Analytics } from '@vercel/analytics/react';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <EnergyProvider>
        <Shell>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/kalkulator" component={Calculator} />
            <Route path="/simulator" component={Simulator} />
            <Route path="/belajar" component={Learn} />
            <Route path="/berita" component={News} />
            <Route component={NotFound} />
          </Switch>
        </Shell>
      </EnergyProvider>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="ai-energy-lab-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
          <Analytics />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
