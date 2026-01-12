'use client'

import { useEffect, useState } from 'react'
import { useGeolocation } from '@/hooks/use-geolocation'
import { calculateDistance, formatDistance } from '@/lib/geo-utils'
import { Bike, ShoppingBag, Utensils, MapPin, Navigation } from 'lucide-react'
import { useStore } from '@/lib/store-provider'

export type OrderingMode = 'delivery' | 'pickup' | 'dine_in';

interface Props {
    onModeChange?: (mode: OrderingMode) => void;
}

export default function OrderingModeSelector({ onModeChange }: Props) {
    const { coordinates, loading, permission } = useGeolocation();
    const { currentStore } = useStore();
    const [mode, setMode] = useState<OrderingMode>('delivery');
    const [distance, setDistance] = useState<number | null>(null);

    // Coordonnées du magasin (À terme, venant de currentStore.settings.geolocation)
    // Pour la démo, on simule une position à Casablanca (Maarif)
    const STORE_COORDS = { lat: 33.5898, lng: -7.6325 }; 

    useEffect(() => {
        if (coordinates && STORE_COORDS) {
            const dist = calculateDistance(
                coordinates.latitude, coordinates.longitude,
                STORE_COORDS.lat, STORE_COORDS.lng
            );
            setDistance(dist);

            // LOGIQUE CONTEXTUELLE "MAGIQUE"
            // Si on est à moins de 50m, on propose "Sur Place"
            if (dist < 50) {
                setMode('dine_in');
                if(onModeChange) onModeChange('dine_in');
            } 
            // Si on est entre 50m et 500m, on propose "A Emporter"
            else if (dist < 500) {
                setMode('pickup');
                if(onModeChange) onModeChange('pickup');
            }
            // Sinon, reste en livraison (défaut)
        }
    }, [coordinates]);

    const handleModeClick = (newMode: OrderingMode) => {
        setMode(newMode);
        if(onModeChange) onModeChange(newMode);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mx-4 -mt-8 relative z-20 flex flex-col gap-2">
            
            {/* Indicateur de Distance */}
            <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <MapPin size={12} className="text-primary"/>
                    {permission === 'denied' ? (
                        <span>Localisation désactivée</span>
                    ) : distance !== null ? (
                        <span>Vous êtes à <b>{formatDistance(distance)}</b> du resto</span>
                    ) : (
                        <span>Localisation en cours...</span>
                    )}
                </div>
                {distance !== null && distance > 500 && (
                    <div className="flex items-center gap-1 text-orange-500 font-bold">
                        <Navigation size={12}/>
                        <span>Livraison recommandée</span>
                    </div>
                )}
            </div>

            {/* Boutons Switcher */}
            <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => handleModeClick('delivery')}
                    className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all duration-300 ${mode === 'delivery' ? 'bg-white shadow-md text-primary font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                    <Bike size={20} className="mb-1"/>
                    <span className="text-[10px] uppercase tracking-wide">Livraison</span>
                </button>

                <button 
                    onClick={() => handleModeClick('pickup')}
                    className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all duration-300 ${mode === 'pickup' ? 'bg-white shadow-md text-primary font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                    <ShoppingBag size={20} className="mb-1"/>
                    <span className="text-[10px] uppercase tracking-wide">A Emporter</span>
                </button>

                <button 
                    onClick={() => handleModeClick('dine_in')}
                    className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all duration-300 ${mode === 'dine_in' ? 'bg-white shadow-md text-primary font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                    <Utensils size={20} className="mb-1"/>
                    <span className="text-[10px] uppercase tracking-wide">Sur Place</span>
                </button>
            </div>
        </div>
    );
}