import { Suspense, lazy } from 'react';
import { LocaleProvider } from './locale';
import { usePath } from './hooks/usePath';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

const ComparePage = lazy(() => import('./pages/ComparePage'));

function AppRoutes() {
  const path = usePath();

  if (path === '/') {
    return <HomePage />;
  }
  if (path === '/compare') {
    return <ComparePage />;
  }
  return <NotFoundPage />;
}

export function App() {
  return (
    <LocaleProvider>
      <div className="app-shell">
        <Suspense fallback={null}>
          <AppRoutes />
        </Suspense>
      </div>
    </LocaleProvider>
  );
}
