// Composant d'intégration PWA complète pour Universal Eats
'use client';

import React, { useEffect, useState } from 'react';
import { usePWA, usePWANotifications, useStandalone } from '@/hooks/use-pwa';
import { initOfflineService } from '@/lib/offline-service';
import { initInstallManager } from '@/lib/install-manager';
import InstallPrompt from './InstallPrompt';
import UpdateAvailable from './UpdateAvailable';
import OfflineIndicator from './OfflineIndicator';

// Import des systèmes Phase 2 - Modifiés pour être compatibles
// import { useNotifications } from '../../admin-panel/hooks/use-notifications';
// import { useLoyalty } from '../../admin-panel/hooks/use-loyalty';
// import { useAnalytics } from '../../admin-panel/hooks/use-analytics';
// import { useLocalization } from '../../admin-panel/hooks/use-localization';

// Hooks mock pour compatibilité temporaire
const useNotifications = () => ({ 
  initializeNotifications: async () => {}, 
  isSupported: true 
});

const useLoyalty = () => ({ 
  initializeLoyalty: async () => {}, 
  getLoyaltyPoints: async () => 0, 
  loyaltyStatus: 'inactive' 
});

const useAnalytics = () => ({ 
  trackEvent: (event: string, data?: any) => { console.log('Analytics:', event, data); }, 
  trackPageView: (path: string) => { console.log('Page view:', path); }, 
  trackPWAInstall: (source: string) => { console.log('PWA install:', source); } 
});

const useLocalization = () => ({ 
  initializeLocalization: async () => {}, 
  currentLanguage: 'fr', 
  t: (key: string) => key 
});

interface PWAIntegrationProps {
  children: React.ReactNode;
  enableOffline?: boolean;
  enableNotifications?: boolean;
  enableInstallPrompt?: boolean;
  enableAnalytics?: boolean;
}

export default function PWAIntegration({
  children,
  enableOffline = true,
  enableNotifications = true,
  enableInstallPrompt = true,
  enableAnalytics = true
}: PWAIntegrationProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  // Hooks PWA
  const { isInstallable, hasUpdate } = usePWA();
  const { requestPermission: requestNotificationPermission, isGranted: hasNotificationPermission } = usePWANotifications();
  const { isStandalone } = useStandalone();

  // Hooks Phase 2
  const { 
    initializeNotifications, 
    isSupported: notificationsSupported 
  } = useNotifications();
  
  const { 
    initializeLoyalty, 
    getLoyaltyPoints, 
    loyaltyStatus 
  } = useLoyalty();
  
  const { 
    trackEvent, 
    trackPageView, 
    trackPWAInstall 
  } = useAnalytics();
  
  const { 
    initializeLocalization, 
    currentLanguage, 
    t 
  } = useLocalization();

  // Initialisation complète de la PWA
  useEffect(() => {
    const initializePWA = async () => {
      try {
        console.log('🚀 Initialisation de la PWA Universal Eats...');

        // Initialiser les services de base
        if (enableOffline) {
          await initOfflineService();
          console.log('✅ Service offline initialisé');
        }

        if (enableInstallPrompt) {
          initInstallManager();
          console.log('✅ Gestionnaire d\'installation initialisé');
        }

        // Initialiser les systèmes Phase 2
        if (enableNotifications && notificationsSupported) {
          await initializeNotifications();
          console.log('✅ Notifications initialisées');
        }

        await initializeLoyalty();
        console.log('✅ Système de fidélité initialisé');

        if (enableAnalytics) {
          trackPageView(window.location.pathname);
          console.log('✅ Analytics initialisés');
        }

        await initializeLocalization();
        console.log('✅ Localisation initialisée');

        setIsInitialized(true);
        console.log('🎉 PWA entièrement initialisée');

        // Envoyer un événement d'initialisation
        trackEvent('pwa_initialized', {
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          language: currentLanguage,
          isStandalone,
          features: {
            offline: enableOffline,
            notifications: enableNotifications && notificationsSupported,
            install: enableInstallPrompt,
            analytics: enableAnalytics
          }
        });

      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation PWA:', error);
      }
    };

    initializePWA();
  }, [
    enableOffline, 
    enableNotifications, 
    enableInstallPrompt, 
    enableAnalytics,
    notificationsSupported,
    initializeNotifications,
    initializeLoyalty,
    trackEvent,
    trackPageView,
    initializeLocalization,
    currentLanguage,
    isStandalone
  ]);

  // Gestion de l'installation
  useEffect(() => {
    if (isInstallable && enableInstallPrompt) {
      // Délai avant d'afficher le prompt d'installation
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 10000); // 10 secondes

      return () => clearTimeout(timer);
    }
  }, [isInstallable, enableInstallPrompt]);

  // Gestion des mises à jour
  useEffect(() => {
    if (hasUpdate) {
      setShowUpdatePrompt(true);
      trackEvent('pwa_update_available', {
        timestamp: Date.now(),
        version: '1.0.0'
      });
    }
  }, [hasUpdate, trackEvent]);

  // Gestion des permissions de notifications
  useEffect(() => {
    if (enableNotifications && notificationsSupported && !hasNotificationPermission) {
      // Demander les permissions après un délai
      const timer = setTimeout(async () => {
        const granted = await requestNotificationPermission();
        if (granted) {
          trackEvent('notification_permission_granted', {
            timestamp: Date.now()
          });
        }
      }, 30000); // 30 secondes

      return () => clearTimeout(timer);
    }
  }, [enableNotifications, notificationsSupported, hasNotificationPermission, requestNotificationPermission, trackEvent]);

  // Gestion de l'état offline/online
  useEffect(() => {
    const handleOnline = () => {
      trackEvent('pwa_back_online', {
        timestamp: Date.now()
      });
    };

    const handleOffline = () => {
      trackEvent('pwa_went_offline', {
        timestamp: Date.now()
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [trackEvent]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initialisation de Universal Eats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-integration">
      {/* Indicateur de statut PWA */}
      <PWAStatusIndicator />
      
      {/* Indicateur de connexion */}
      <OfflineIndicator />
      
      {/* Composant principal */}
      {children}
      
      {/* Prompt d'installation */}
      {enableInstallPrompt && showInstallPrompt && (
        <InstallPrompt
          onInstall={() => {
            setShowInstallPrompt(false);
            trackPWAInstall('user_initiated');
          }}
          onDismiss={() => {
            setShowInstallPrompt(false);
            trackEvent('pwa_install_dismissed', {
              timestamp: Date.now()
            });
          }}
        />
      )}
      
      {/* Prompt de mise à jour */}
      {hasUpdate && showUpdatePrompt && (
        <UpdateAvailable
          onUpdate={() => {
            setShowUpdatePrompt(false);
            trackEvent('pwa_update_accepted', {
              timestamp: Date.now()
            });
          }}
          onDismiss={() => {
            setShowUpdatePrompt(false);
            trackEvent('pwa_update_dismissed', {
              timestamp: Date.now()
            });
          }}
        />
      )}
      
      {/* Widget de fidélité flottant */}
      <LoyaltyFloatingWidget />
      
      {/* Widget de notifications */}
      <NotificationsWidget />
    </div>
  );
}

// Composant d'indicateur de statut PWA
function PWAStatusIndicator() {
  const { isStandalone } = useStandalone();
  const { isOnline } = usePWA();

  if (!isStandalone && !isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 text-sm z-50">
        <span className="font-medium">
          📱 Mode hors ligne - Installez l&apos;app pour une meilleure expérience
        </span>
      </div>
    );
  }

  if (isStandalone) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-green-500 text-white text-center py-1 text-xs z-40 opacity-75">
        <span>✅ App installée - Mode natif</span>
      </div>
    );
  }

  return null;
}

// Widget flottant de fidélité
function LoyaltyFloatingWidget() {
  const { getLoyaltyPoints, loyaltyStatus } = useLoyalty();
  const [points, setPoints] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const loadPoints = async () => {
      try {
        const userPoints = await getLoyaltyPoints();
        setPoints(userPoints);
        setIsVisible(userPoints > 0);
      } catch (error) {
        console.warn('Erreur lors du chargement des points de fidélité:', error);
      }
    };

    loadPoints();
    
    // Mettre à jour périodiquement
    const interval = setInterval(loadPoints, 60000); // Chaque minute
    
    return () => clearInterval(interval);
  }, [getLoyaltyPoints]);

  if (!isVisible || points === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-30">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full px-4 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <div className="text-sm">
            <div className="font-semibold">{points} points</div>
            <div className="text-xs opacity-90">Fidélité</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Widget de notifications PWA
function NotificationsWidget() {
  const { isGranted: hasNotificationPermission } = usePWANotifications();
  const { trackEvent } = useAnalytics();

  const handleEnableNotifications = async () => {
    try {
      // Cette fonction sera fournie par le hook usePWANotifications
      trackEvent('notification_enablement_attempted', {
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Erreur lors de l\'activation des notifications:', error);
    }
  };

  if (hasNotificationPermission) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-500 text-white rounded-lg p-3 shadow-lg z-30 max-w-xs">
      <div className="flex items-start gap-3">
        <span className="text-lg">🔔</span>
        <div className="flex-1">
          <h4 className="font-medium text-sm mb-1">
            Restez informé !
          </h4>
          <p className="text-xs opacity-90 mb-2">
            Activez les notifications pour recevoir vos commandes en temps réel
          </p>
          <button
            onClick={handleEnableNotifications}
            className="bg-white text-blue-500 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
          >
            Activer
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook pour les métriques PWA
export function usePWAMetrics() {
  const { trackEvent } = useAnalytics();
  const { isStandalone } = useStandalone();

  const trackPWAUsage = React.useCallback((feature: string, duration?: number) => {
    trackEvent('pwa_feature_usage', {
      feature,
      duration,
      isStandalone,
      timestamp: Date.now()
    });
  }, [trackEvent, isStandalone]);

  const trackPerformanceMetric = React.useCallback((metric: string, value: number) => {
    trackEvent('pwa_performance', {
      metric,
      value,
      isStandalone,
      timestamp: Date.now()
    });
  }, [trackEvent, isStandalone]);

  const trackUserEngagement = React.useCallback((action: string, context?: any) => {
    trackEvent('pwa_user_engagement', {
      action,
      context,
      isStandalone,
      timestamp: Date.now()
    });
  }, [trackEvent, isStandalone]);

  return {
    trackPWAUsage,
    trackPerformanceMetric,
    trackUserEngagement
  };
}