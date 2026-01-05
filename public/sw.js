// Service Worker pour Universal Eats PWA
// Cache intelligent avec stratégies multiples et fonctionnement offline

const CACHE_NAME = 'universal-eats-v1.0.0';
const STATIC_CACHE = 'universal-eats-static-v1.0.0';
const DYNAMIC_CACHE = 'universal-eats-dynamic-v1.0.0';
const API_CACHE = 'universal-eats-api-v1.0.0';

// Ressources critiques à mettre en cache immédiatement
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

// Ressources à mettre en cache avec lazy loading
const RUNTIME_ASSETS = [
  '/api/menu',
  '/api/stores',
  '/api/promotions',
  '/api/loyalty'
];

// Stratégies de cache
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation');
  
  event.waitUntil(
    Promise.all([
      // Cache des ressources statiques
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('📦 Cache des ressources statiques');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting pour activation immédiate
      self.skipWaiting()
    ])
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activation');
  
  event.waitUntil(
    Promise.all([
      // Nettoyage des anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE &&
                cacheName.startsWith('universal-eats-')) {
              console.log('🗑️ Suppression de l\'ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim des clients immédiatement
      self.clients.claim()
    ])
  );
});

// Gestion des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-HTTP
  if (!request.url.startsWith('http')) return;
  
  // Stratégies spécifiques par type de ressource
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
  } else if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(handleStaticAssetRequest(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

// Gestion des requêtes API
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Pour les requêtes de données critiques
    if (url.pathname.includes('/menu') || url.pathname.includes('/stores')) {
      return await networkFirst(request, API_CACHE);
    }
    
    // Pour les autres API
    return await staleWhileRevalidate(request, API_CACHE);
  } catch (error) {
    console.error('Erreur API request:', error);
    
    // Retourner des données en cache ou une réponse offline
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Réponse offline pour les API
    return new Response(
      JSON.stringify({
        error: 'Service indisponible hors ligne',
        offline: true,
        timestamp: Date.now()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Gestion des images
async function handleImageRequest(request) {
  try {
    return await cacheFirst(request, DYNAMIC_CACHE);
  } catch (error) {
    console.error('Erreur image request:', error);
    
    // Retourner une image placeholder
    return new Response(
      '<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">Image non disponible</text></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    );
  }
}

// Gestion des ressources statiques
async function handleStaticAssetRequest(request) {
  return await cacheFirst(request, STATIC_CACHE);
}

// Gestion des pages
async function handlePageRequest(request) {
  try {
    return await networkFirst(request, DYNAMIC_CACHE);
  } catch (error) {
    console.error('Erreur page request:', error);
    
    // Retourner la page offline
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    
    // Fallback simple
    return new Response(
      '<!DOCTYPE html><html><head><title>Universal Eats - Hors ligne</title></head><body><h1>Vous êtes hors ligne</h1><p>Vérifiez votre connexion internet et réessayez.</p></body></html>',
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Stratégies de cache
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.error('Erreur network fetch:', error);
    return null;
  });
  
  // Retourner le cache immédiatement, puis mettre à jour en arrière-plan
  return cachedResponse || fetchPromise;
}

// Gestion des messages du client
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'PRELOAD_ROUTES':
      preloadRoutes(payload.routes);
      break;
      
    default:
      console.log('Message inconnu:', type);
  }
});

// Fonction pour effacer tous les caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Fonction pour précharger des routes
async function preloadRoutes(routes) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  await Promise.all(
    routes.map(async (route) => {
      try {
        const response = await fetch(route);
        if (response.ok) {
          await cache.put(route, response);
          console.log('✅ Route préchargée:', route);
        }
      } catch (error) {
        console.warn('⚠️ Échec du préchargement:', route, error);
      }
    })
  );
}

// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Synchroniser les commandes en attente
    const pendingOrders = await getPendingOrders();
    
    for (const order of pendingOrders) {
      try {
        await syncOrder(order);
        await removePendingOrder(order.id);
      } catch (error) {
        console.error('Erreur sync order:', order.id, error);
      }
    }
  } catch (error) {
    console.error('Erreur background sync:', error);
  }
}

// Gestion des notifications push
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'universal-eats',
    data: data.data,
    actions: data.actions || [
      {
        action: 'view',
        title: 'Voir',
        icon: '/icons/view-action.png'
      },
      {
        action: 'dismiss',
        title: 'Ignorer',
        icon: '/icons/dismiss-action.png'
      }
    ],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const { action, data } = event;
  
  if (action === 'dismiss') {
    return;
  }
  
  // Action par défaut ou action 'view'
  const urlToOpen = data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Vérifier si une fenêtre est déjà ouverte
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Utilitaires pour les commandes en attente
async function getPendingOrders() {
  // Récupérer depuis IndexedDB ou cache
  const cache = await caches.open(DYNAMIC_CACHE);
  const response = await cache.match('/pending-orders');
  if (response) {
    return await response.json();
  }
  return [];
}

async function syncOrder(order) {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
  
  if (!response.ok) {
    throw new Error(`Échec sync: ${response.status}`);
  }
  
  return response.json();
}

async function removePendingOrder(orderId) {
  // Supprimer de la liste des commandes en attente
  const pendingOrders = await getPendingOrders();
  const updatedOrders = pendingOrders.filter(order => order.id !== orderId);
  
  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.put('/pending-orders', new Response(JSON.stringify(updatedOrders)));
}

console.log('🎯 Universal Eats Service Worker chargé');