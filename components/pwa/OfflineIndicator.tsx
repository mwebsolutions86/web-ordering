// Composant pour indiquer l'état de connexion
'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface OfflineIndicatorProps {
  className?: string;
  showMessage?: boolean;
  position?: 'top' | 'bottom';
}

export default function OfflineIndicator({ 
  className = '', 
  showMessage = true, 
  position = 'top' 
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !wasOffline) {
    return null;
  }

  const positionClasses = position === 'top' 
    ? 'top-0 left-0 right-0' 
    : 'bottom-0 left-0 right-0';

  return (
    <div className={`fixed ${positionClasses} z-50 ${className}`}>
      <div className={`
        transition-all duration-300 ease-in-out
        ${isOnline ? 'bg-green-500' : 'bg-red-500'}
        ${wasOffline ? 'animate-pulse' : ''}
      `}>
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-white text-sm font-medium">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4" />
                {showMessage && <span>Connexion rétablie</span>}
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                {showMessage && <span>Vous êtes hors ligne</span>}
                {!showMessage && <AlertCircle className="w-4 h-4" />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant pour afficher une bannière offline en bas de page
export function OfflineBanner() {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-5 h-5 animate-pulse" />
        <span className="font-medium">
          Mode hors ligne - Certaines fonctionnalités peuvent être limitées
        </span>
      </div>
    </div>
  );
}