// Composant pour gérer les mises à jour de la PWA
'use client';

import { useState, useEffect } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';

interface UpdateAvailableProps {
  onUpdate?: () => void;
  onDismiss?: () => void;
}

export default function UpdateAvailable({ onUpdate, onDismiss }: UpdateAvailableProps) {
  const { hasUpdate, registration, applyUpdates } = usePWA();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      applyUpdates();
      onUpdate?.();
      
      // Recharger la page après un court délai
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    onDismiss?.();
  };

  if (!hasUpdate) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Download className="w-6 h-6 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">
            Mise à jour disponible
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Une nouvelle version de l&apos;application est disponible avec des améliorations.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 rounded-md transition-colors"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                'Mettre à jour'
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Composant de mise à jour en arrière-plan
export function BackgroundUpdate() {
  const { hasUpdate, registration } = usePWA();
  
  useEffect(() => {
    if (hasUpdate && registration?.waiting) {
      // Afficher une notification de mise à jour en arrière-plan
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Universal Eats', {
          body: 'Une nouvelle version est disponible. Actualisez pour obtenir les dernières fonctionnalités.',
          icon: '/icons/icon-192x192.png',
          tag: 'app-update',
          // Some TS DOM libs don't include "actions" on NotificationOptions; cast to any to support it
          actions: [
            { action: 'update', title: 'Mettre à jour' },
            { action: 'dismiss', title: 'Plus tard' }
          ]
        } as any);
      }
    }
  }, [hasUpdate, registration]);

  return null;
}