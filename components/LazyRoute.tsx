// Composant de route lazy-loading intelligent pour la PWA
'use client';

import React, { lazy, Suspense, ComponentType } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

interface LazyRouteProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  errorFallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  preload?: boolean;
  route?: string;
}

// Composant de chargement sophistiqué
function RouteSkeleton({ route }: { route?: string }) {
  const getSkeletonContent = () => {
    switch (route) {
      case '/cart':
        return (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case '/loyalty':
        return (
          <div className="animate-pulse">
            <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-32 rounded-lg mb-6"></div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
              ))}
            </div>
          </div>
        );

      case '/':
      default:
        return (
          <div className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-lg mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-gray-200 h-40 rounded-lg"></div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {getSkeletonContent()}
    </div>
  );
}

// Composant d'erreur amélioré
function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Oups ! Une erreur s&apos;est produite
        </h2>
        <p className="text-gray-600 mb-6">
          Nous ne pouvons pas charger cette page pour le moment.
        </p>
        <button
          onClick={reset}
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Réessayer
        </button>
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Détails techniques
          </summary>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
            {error.message}
          </pre>
        </details>
      </div>
    </div>
  );
}

// Préchargeur intelligent
class RoutePreloader {
  private static instance: RoutePreloader;
  private preloadedRoutes = new Set<string>();
  private preloadQueue = new Map<string, Promise<any>>();

  static getInstance(): RoutePreloader {
    if (!RoutePreloader.instance) {
      RoutePreloader.instance = new RoutePreloader();
    }
    return RoutePreloader.instance;
  }

  async preloadRoute(
    routeName: string,
    loader: () => Promise<{ default: ComponentType<any> }>,
    priority: 'high' | 'low' = 'low'
  ): Promise<void> {
    if (this.preloadedRoutes.has(routeName)) return;

    // Si déjà en cours de préchargement, attendre
    if (this.preloadQueue.has(routeName)) {
      return this.preloadQueue.get(routeName);
    }

    const preloadPromise = this.doPreload(loader, priority);
    this.preloadQueue.set(routeName, preloadPromise);

    try {
      await preloadPromise;
      this.preloadedRoutes.add(routeName);
    } catch (error) {
      console.warn(`Échec du préchargement de ${routeName}:`, error);
    } finally {
      this.preloadQueue.delete(routeName);
    }
  }

  private async doPreload(
    loader: () => Promise<{ default: ComponentType<any> }>,
    priority: 'high' | 'low'
  ): Promise<void> {
    if (priority === 'high') {
      // Préchargement immédiat pour les routes critiques
      await loader();
    } else {
      // Préchargement différé pour les autres routes
      if ('requestIdleCallback' in window) {
        await new Promise<void>((resolve) => {
          requestIdleCallback(async () => {
            await loader();
            resolve();
          });
        });
      } else {
        // Fallback pour les navigateurs sans requestIdleCallback
        setTimeout(async () => {
          await loader();
        }, 100);
      }
    }
  }

  // Préchargement intelligent basé sur l'interaction utilisateur
  startIntelligentPreloading() {
    let hoverTimeout: NodeJS.Timeout;

    // Préchargement au survol des liens
    const handleMouseEnter = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[data-preload]') as HTMLAnchorElement;
      
      if (!link) return;

      // Annuler le préchargement précédent
      clearTimeout(hoverTimeout);

      // Démarrer le préchargement après un court délai
      hoverTimeout = setTimeout(() => {
        const routeName = link.getAttribute('data-preload');
        const loader = this.getLoaderForRoute(routeName);
        
        if (loader) {
          this.preloadRoute(routeName!, loader, 'low');
        }
      }, 100);
    };

    // Préchargement au focus des liens
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[data-preload]') as HTMLAnchorElement;
      
      if (!link) return;

      const routeName = link.getAttribute('data-preload');
      const loader = this.getLoaderForRoute(routeName);
      
      if (loader) {
        this.preloadRoute(routeName!, loader, 'low');
      }
    };

    // Préchargement au scroll (pour les liens hors écran)
    const handleScroll = this.throttle(() => {
      const links = document.querySelectorAll('a[data-preload]');
      
      links.forEach(link => {
        const rect = link.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const routeName = link.getAttribute('data-preload');
          const loader = this.getLoaderForRoute(routeName);
          
          if (loader && !this.preloadedRoutes.has(routeName!)) {
            this.preloadRoute(routeName!, loader, 'low');
          }
        }
      });
    }, 500);

    document.addEventListener('mouseenter', handleMouseEnter, true);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('scroll', handleScroll, true);

    // Nettoyage
    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }

  public getLoaderForRoute(routeName?: string | null) {
    if (!routeName) return null;

    const loaders: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
      '/cart': () => import('@/app/cart/page')
      // Note: other routes (e.g., loyalty, promotions, profile) may not be present in this app.
      // Attempting to statically import missing pages causes build-time errors, so we only
      // provide loaders for routes that exist in this workspace.
    };

    return loaders[routeName];
  }

  private throttle(func: Function, delay: number) {
    let timeoutId: NodeJS.Timeout;
    let lastExecTime = 0;
    
    return function (...args: any[]) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }
}

// Composant principal LazyRoute
export default function LazyRoute({
  component,
  fallback,
  errorFallback = RouteError,
  preload = false,
  route
}: LazyRouteProps) {
  const LazyComponent = lazy(component);

  // Error boundary to catch rendering errors in the async component
  class ErrorBoundary extends React.Component<React.PropsWithChildren<{ fallback?: React.ComponentType<{ error: Error; reset: () => void }> }>, { hasError: boolean; error?: Error }> {
    state: { hasError: boolean; error?: Error } = { hasError: false, error: undefined };

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
      // You could report errors here to an analytics service
      console.error('ErrorBoundary caught an error:', error);
    }

    reset = () => this.setState({ hasError: false, error: undefined });

    render() {
      if (this.state.hasError) {
        const Fallback = this.props.fallback || RouteError;
        return <Fallback error={this.state.error!} reset={this.reset} />;
      }
      return this.props.children as React.ReactElement;
    }
  }

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback || <RouteSkeleton route={route} />}>
        <LazyComponent />
      </Suspense>
    </ErrorBoundary>
  );
}

// Routes pré-définies avec lazy loading
const PlaceholderPage: React.FC = () => (
  <div className="p-8 text-center text-gray-600">Page non disponible</div>
);

export const LazyRoutes = {
  CartPage: lazy(() => import('@/app/cart/page')),
  LoyaltyPage: lazy(async () => ({ default: PlaceholderPage })),
  PromotionsPage: lazy(async () => ({ default: PlaceholderPage })),
  ProfilePage: lazy(async () => ({ default: PlaceholderPage })),
  OrdersPage: lazy(async () => ({ default: PlaceholderPage }))
};

// Hook pour la gestion du préchargement intelligent
export function useIntelligentPreloading() {
  const preloader = RoutePreloader.getInstance();

  const preloadCriticalRoutes = React.useCallback(() => {
    // Préchargement des routes critiques au démarrage
    const criticalRoutes = [
      { route: '/cart', loader: () => import('@/app/cart/page'), priority: 'high' as const }
    ];

    criticalRoutes.forEach(({ route, loader, priority }) => {
      preloader.preloadRoute(route, loader, priority);
    });
  }, [preloader]);

  const startPreloading = React.useCallback(() => {
    return preloader.startIntelligentPreloading();
  }, [preloader]);

  const preloadOnDemand = React.useCallback((routeName: string) => {
    const loader = preloader.getLoaderForRoute(routeName);
    if (loader) {
      preloader.preloadRoute(routeName, loader, 'low');
    }
  }, [preloader]);

  return {
    preloadCriticalRoutes,
    startPreloading,
    preloadOnDemand
  };
}

// Composant de préchargement automatique
export function AutoPreloader() {
  const { preloadCriticalRoutes, startPreloading } = useIntelligentPreloading();

  React.useEffect(() => {
    // Préchargement des routes critiques
    preloadCriticalRoutes();

    // Démarrage du préchargement intelligent
    const cleanup = startPreloading();

    return cleanup;
  }, [preloadCriticalRoutes, startPreloading]);

  return null; // Composant invisible
}

// Hook pour les métriques de performance des routes
export function useRouteMetrics() {
  const [metrics, setMetrics] = React.useState<Record<string, {
    loadTime: number;
    bundleSize: number;
    renderTime: number;
  }>>({});

  const trackRouteLoad = React.useCallback((routeName: string, startTime: number) => {
    const loadTime = Date.now() - startTime;
    const renderTime = performance.now();
    
    setMetrics(prev => ({
      ...prev,
      [routeName]: {
        loadTime,
        bundleSize: 0, // Serait calculé via webpack stats
        renderTime
      }
    }));

    console.log(`📊 Métriques de route ${routeName}:`, {
      loadTime: `${loadTime}ms`,
      renderTime: `${renderTime.toFixed(2)}ms`
    });
  }, []);

  return {
    metrics,
    trackRouteLoad
  };
}