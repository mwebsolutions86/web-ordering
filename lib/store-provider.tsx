'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';

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
  isLoading: false,
});

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to load store from localStorage
    const storedStore = localStorage.getItem('selected-store');
    if (storedStore) {
      try {
        setCurrentStore(JSON.parse(storedStore));
      } catch (e) {
        console.error('Error parsing stored store:', e);
      }
    }
    setIsLoading(false);
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

