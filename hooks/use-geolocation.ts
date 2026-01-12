import { useState, useEffect } from 'react';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface GeolocationState {
  coordinates: Coordinates | null;
  loading: boolean;
  error: string | null;
  permission: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    loading: true,
    error: null,
    permission: 'unknown'
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, loading: false, error: "Géolocalisation non supportée" }));
      return;
    }

    // Vérifier les permissions
    navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
        setState(s => ({ ...s, permission: result.state }));
        result.onchange = () => setState(s => ({ ...s, permission: result.state }));
    }).catch(() => {});

    // Demander la position
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          },
          loading: false,
          error: null,
          permission: 'granted'
        });
      },
      (error) => {
        setState(s => ({
          ...s,
          loading: false,
          error: error.message,
          permission: error.code === 1 ? 'denied' : 'prompt'
        }));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
}