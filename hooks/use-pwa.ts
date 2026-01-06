// Hook React pour la gestion PWA complète
'use client';

import { useState, useEffect, useCallback } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isUpdateAvailable: false,
    registration: null
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Vérifier si l'app est installée
  const checkIfInstalled = useCallback(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    return isStandalone || isInWebAppiOS;
  }, []);

  // Vérifier l'état de la connexion
  const checkOnlineStatus = useCallback(() => {
    return navigator.onLine;
  }, []);

  // Demander l'installation
  const requestInstall = useCallback(async () => {
    if (!deferredPrompt) {
      throw new Error('Le prompt d\u0027installation n\u0027est pas disponible');
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      setDeferredPrompt(null);
      
      if (outcome === 'accepted') {
        return { success: true, outcome };
      } else {
        return { success: false, outcome };
      }
    } catch (error) {
      console.error('Erreur lors de l\u0027installation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }, [deferredPrompt]);

  // Vérifier les mises à jour
  const checkForUpdates = useCallback(async () => {
    if (!state.registration) return false;

    try {
      await state.registration.update();
      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification des mises à jour:', error);
      return false;
    }
  }, [state.registration]);

  // Appliquer les mises à jour
  const applyUpdates = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [state.registration]);

  // Nettoyer le cache
  const clearCache = useCallback(async (): Promise<boolean> => {
    if (!state.registration) return false;

    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      return true;
    } catch (error) {
      console.error('Erreur lors du nettoyage du cache:', error);
      return false;
    }
  }, [state.registration]);

  // Initialisation
  useEffect(() => {
    // Vérifier l'installation initiale
    setState(prev => ({
      ...prev,
      isInstalled: checkIfInstalled()
    }));

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState(prev => ({
        ...prev,
        isInstallable: true
      }));
    };

    // Écouter l'installation
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false
      }));
      setDeferredPrompt(null);
    };

    // Écouter les changements de connexion
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    // S'enregistrer pour le service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          setState(prev => ({
            ...prev,
            registration
          }));

          // Vérifier les mises à jour
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setState(prev => ({ ...prev, isUpdateAvailable: true }));
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Erreur lors de l\u0027enregistrement du service worker:', error);
        });

      // Écouter l'activation du contrôleur
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    // Ajouter les event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Nettoyage
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkIfInstalled]);

  return {
    // État
    ...state,
    
    // Actions
    requestInstall,
    checkForUpdates,
    applyUpdates,
    clearCache,
    
    // Utilitaires
    isInstallable: state.isInstallable && !state.isInstalled,
    isOffline: !state.isOnline,
    hasUpdate: state.isUpdateAvailable
  };
}

// Hook pour les notifications PWA
export function usePWANotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      throw new Error('Les notifications ne sont pas supportées');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      return false;
    }
  }, []);

  const showNotification = useCallback(async (
    title: string,
    options?: NotificationOptions
  ) => {
    if (permission !== 'granted') {
      throw new Error('Permission de notification non accordée');
    }

    // Récupérer l'enregistrement du service worker au moment de l'envoi
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('Service worker non enregistré');
    }

    try {
      await registration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options
      } as any);
    } catch (error) {
      console.error('Erreur lors de l\u0027affichage de la notification:', error);
    }
  }, [permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied'
  };
}

// Hook pour la gestion du mode standalone
export function useStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInWebAppiOS, setIsInWebAppiOS] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneWindow = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebApp = (window.navigator as any).standalone === true;
      
      setIsStandalone(isStandaloneWindow);
      setIsInWebAppiOS(isInWebApp);
    };

    checkStandalone();

    // Écouter les changements de display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);

    return () => {
      mediaQuery.removeEventListener('change', checkStandalone);
    };
  }, []);

  return {
    isStandalone,
    isInWebAppiOS,
    isPWA: isStandalone || isInWebAppiOS
  };
}

// Hook pour les raccourcis PWA
export function usePWAShortcuts() {
  const [shortcuts, setShortcuts] = useState<Array<{
    name: string;
    short_name: string;
    description: string;
    url: string;
    icons: Array<{ src: string; sizes: string }>;
  }>>([]);

  useEffect(() => {
    const loadShortcuts = async () => {
      try {
        const response = await fetch('/manifest.json');
        const manifest = await response.json();
        
        if (manifest.shortcuts) {
          setShortcuts(manifest.shortcuts);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des raccourcis:', error);
      }
    };

    loadShortcuts();
  }, []);

  return { shortcuts };
}

// Hook pour les métriques de performance PWA
export function usePWAPerformance() {
  const [metrics, setMetrics] = useState({
    firstPaint: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
    firstInputDelay: 0,
    timeToInteractive: 0
  });

  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          setMetrics(prev => ({
            ...prev,
            [entry.name]: entry.startTime
          }));
        });
      });

      try {
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });
      } catch (error) {
        console.warn('Certaines métriques ne sont pas supportées:', error);
      }

      return () => observer.disconnect();
    }
  }, []);

  const getScore = useCallback(() => {
    const scores = {
      fcp: metrics.firstContentfulPaint < 1800 ? 100 : metrics.firstContentfulPaint < 3000 ? 50 : 0,
      lcp: metrics.largestContentfulPaint < 2500 ? 100 : metrics.largestContentfulPaint < 4000 ? 50 : 0,
      cls: metrics.cumulativeLayoutShift < 0.1 ? 100 : metrics.cumulativeLayoutShift < 0.25 ? 50 : 0,
      fid: metrics.firstInputDelay < 100 ? 100 : metrics.firstInputDelay < 300 ? 50 : 0
    };

    return Math.round((scores.fcp + scores.lcp + scores.cls + scores.fid) / 4);
  }, [metrics]);

  return {
    metrics,
    score: getScore(),
    isGood: getScore() >= 90
  };
}