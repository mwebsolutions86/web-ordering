// Service de cache offline pour Universal Eats PWA
'use client';

export interface OfflineData {
  id: string;
  type: 'menu' | 'stores' | 'orders' | 'user' | 'cart';
  data: any;
  timestamp: number;
  expiry?: number;
}

export interface CacheStrategy {
  maxAge: number;
  maxEntries: number;
  priority: 'high' | 'medium' | 'low';
}

export class OfflineService {
  private dbName = 'UniversalEatsOffline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  
  // Stratégies de cache par type
  private strategies: Record<string, CacheStrategy> = {
    menu: { maxAge: 24 * 60 * 60 * 1000, maxEntries: 100, priority: 'high' },
    stores: { maxAge: 12 * 60 * 60 * 1000, maxEntries: 50, priority: 'high' },
    orders: { maxAge: 7 * 24 * 60 * 60 * 1000, maxEntries: 200, priority: 'medium' },
    user: { maxAge: 60 * 60 * 1000, maxEntries: 10, priority: 'high' },
    cart: { maxAge: 24 * 60 * 60 * 1000, maxEntries: 5, priority: 'high' }
  };

  constructor() {
    this.initDB();
  }

  // Initialiser IndexedDB
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Erreur lors de l\'ouverture d\'IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Créer les object stores
        if (!db.objectStoreNames.contains('offline-data')) {
          const store = db.createObjectStore('offline-data', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('expiry', 'expiry', { unique: false });
        }

        if (!db.objectStoreNames.contains('pending-requests')) {
          const store = db.createObjectStore('pending-requests', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Sauvegarder des données en cache
  async cacheData(type: string, data: any, customId?: string): Promise<void> {
    if (!this.db) await this.initDB();

    const id = customId || `${type}-${Date.now()}`;
    const strategy = this.strategies[type] || this.strategies['menu'];
    
    const offlineData: OfflineData = {
      id,
      type: type as any,
      data,
      timestamp: Date.now(),
      expiry: strategy.maxAge ? Date.now() + strategy.maxAge : undefined
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-data'], 'readwrite');
      const store = transaction.objectStore('offline-data');
      
      const request = store.put(offlineData);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Récupérer des données du cache
  async getCachedData<T>(type: string, id?: string): Promise<T | null> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-data'], 'readonly');
      const store = transaction.objectStore('offline-data');
      
      let request: IDBRequest;
      
      if (id) {
        request = store.get(id);
      } else {
        // Récupérer le dernier élément de ce type
        const index = store.index('type');
        const range = IDBKeyRange.only(type);
        request = index.openCursor(range, 'prev');
      }

      request.onsuccess = () => {
        const result = request.result as IDBCursorWithValue | undefined;
        
        if (!result) {
          resolve(null);
          return;
        }

        const data = result.value as OfflineData;
        
        // Vérifier si les données sont expirées
        if (data.expiry && Date.now() > data.expiry) {
          this.removeExpiredData(data.id);
          resolve(null);
          return;
        }

        resolve(data.data as T);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Récupérer toutes les données d'un type
  async getAllCachedData<T>(type: string): Promise<T[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-data'], 'readonly');
      const store = transaction.objectStore('offline-data');
      const index = store.index('type');
      const range = IDBKeyRange.only(type);
      
      const request = index.getAll(range);
      
      request.onsuccess = () => {
        const results = request.result as OfflineData[];
        const validData = results.filter(item => 
          !item.expiry || Date.now() <= item.expiry
        );
        
        resolve(validData.map(item => item.data as T));
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Supprimer des données expirées
  private async removeExpiredData(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-data'], 'readwrite');
      const store = transaction.objectStore('offline-data');
      
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Nettoyer toutes les données expirées
  async cleanExpiredData(): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-data'], 'readwrite');
      const store = transaction.objectStore('offline-data');
      const index = store.index('expiry');
      
      const request = index.openCursor();
      
      request.onsuccess = () => {
        const cursor = request.result as IDBCursorWithValue | undefined;
        
        if (!cursor) {
          resolve();
          return;
        }

        const data = cursor.value as OfflineData;
        
        if (data.expiry && Date.now() > data.expiry) {
          cursor.delete();
        }
        
        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Sauvegarder une requête en attente (pour synchronisation hors ligne)
  async savePendingRequest(url: string, method: string, body?: any): Promise<void> {
    if (!this.db) await this.initDB();

    const pendingRequest = {
      url,
      method,
      body: body ? JSON.stringify(body) : null,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pending-requests'], 'readwrite');
      const store = transaction.objectStore('pending-requests');
      
      const request = store.add(pendingRequest);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Récupérer les requêtes en attente
  async getPendingRequests(): Promise<Array<{
    id: number;
    url: string;
    method: string;
    body: string | null;
    timestamp: number;
  }>> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pending-requests'], 'readonly');
      const store = transaction.objectStore('pending-requests');
      
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Supprimer une requête en attente
  async removePendingRequest(id: number): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pending-requests'], 'readwrite');
      const store = transaction.objectStore('pending-requests');
      
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Vider complètement le cache
  async clearAllCache(): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-data', 'pending-requests'], 'readwrite');
      
      transaction.objectStore('offline-data').clear();
      transaction.objectStore('pending-requests').clear();
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Synchroniser les données en arrière-plan
  async syncPendingRequests(): Promise<void> {
    if (!navigator.onLine) {
      console.log('Synchronisation reportée - pas de connexion internet');
      return;
    }

    try {
      const pendingRequests = await this.getPendingRequests();
      
      for (const request of pendingRequests) {
        try {
          const response = await fetch(request.url, {
            method: request.method,
            headers: { 'Content-Type': 'application/json' },
            body: request.body
          });

          if (response.ok) {
            await this.removePendingRequest(request.id);
            console.log('✅ Requête synchronisée:', request.url);
          }
        } catch (error) {
          console.error('❌ Erreur sync:', request.url, error);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
    }
  }

  // Obtenir les statistiques du cache
  async getCacheStats(): Promise<{
    totalEntries: number;
    entriesByType: Record<string, number>;
    pendingRequests: number;
    cacheSize: string;
  }> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-data', 'pending-requests'], 'readonly');
      
      const dataStore = transaction.objectStore('offline-data');
      const requestStore = transaction.objectStore('pending-requests');
      
      Promise.all([
        new Promise<number>((res, rej) => {
          const request = dataStore.count();
          request.onsuccess = () => res(request.result);
          request.onerror = () => rej(request.error);
        }),
        new Promise<Record<string, number>>((res, rej) => {
          const index = dataStore.index('type');
          const types: Record<string, number> = {};
          
          index.openCursor().onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | undefined;
            
            if (cursor) {
              const type = cursor.value.type;
              types[type] = (types[type] || 0) + 1;
              cursor.continue();
            } else {
              res(types);
            }
          };
        }),
        new Promise<number>((res, rej) => {
          const request = requestStore.count();
          request.onsuccess = () => res(request.result);
          request.onerror = () => rej(request.error);
        })
      ]).then(([totalEntries, entriesByType, pendingRequests]) => {
        resolve({
          totalEntries,
          entriesByType,
          pendingRequests,
          cacheSize: this.formatBytes(totalEntries * 1024) // Estimation
        });
      }).catch(reject);
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Instance singleton
export const offlineService = new OfflineService();

// Fonction d'initialisation automatique
export async function initOfflineService(): Promise<void> {
  try {
    await offlineService.initDB();
    
    // Nettoyer les données expirées au démarrage
    await offlineService.cleanExpiredData();
    
    // Configurer la synchronisation automatique
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Enregistrer la synchronisation en arrière-plan
        if ('sync' in registration) {
          registration.sync.register('background-sync');
        }
      });
    }
    
    console.log('🚀 Service offline initialisé');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du service offline:', error);
  }
}