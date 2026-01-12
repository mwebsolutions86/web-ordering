'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORE_ID } from '@/lib/constants'; // ✅ Import de l'ID configuré
import { supabase } from '@/lib/supabase';

export type Store = {
  id: string;
  brand_id: string;
  name: string;
  address?: string;
  delivery_fees?: number;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string | null;
};

type StoreContextType = {
  currentStore: Store | null;
  setStore: (store: Store) => void;
  isLoading: boolean;
};

const StoreContext = createContext<StoreContextType>({
  currentStore: null,
  setStore: () => {},
  isLoading: true,
});

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeStore = async () => {
      try {
        // 1. Essayer de charger depuis le localStorage (Cache rapide)
        const storedStore = localStorage.getItem('selected-store');
        
        if (storedStore) {
          try {
            const parsedStore = JSON.parse(storedStore);
            // Vérification de sécurité : est-ce que c'est bien le bon store configuré ?
            if (parsedStore.id === STORE_ID) {
               setCurrentStore(parsedStore);
               setIsLoading(false);
               return; // On a trouvé, on s'arrête là
            }
          } catch (e) {
            console.error('Erreur lecture cache store:', e);
          }
        }

        // 2. Si pas de cache (ou mauvais ID), on charge depuis Supabase avec l'ID des constantes
        console.log("🔄 Chargement du magasin configuré :", STORE_ID);
        const { data: storeData, error } = await supabase
          .from('stores')
          .select('*')
          .eq('id', STORE_ID)
          .single();

        if (error) throw error;

        if (storeData) {
          console.log("✅ Magasin chargé :", storeData.name);
          setCurrentStore(storeData);
          // On met à jour le cache pour la prochaine fois
          localStorage.setItem('selected-store', JSON.stringify(storeData));
        } else {
          console.error("❌ Aucun magasin trouvé avec l'ID :", STORE_ID);
        }

      } catch (err) {
        console.error("Erreur fatale initialisation StoreProvider:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeStore();
  }, []);

  const setStore = (store: Store) => {
    setCurrentStore(store);
    localStorage.setItem('selected-store', JSON.stringify(store));
  };

  return (
    <StoreContext.Provider value={{ currentStore, setStore, isLoading }}>
      {children}
    </StoreContext.Provider>
  );
};