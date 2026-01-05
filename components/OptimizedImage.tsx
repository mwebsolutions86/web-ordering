// Composant d'image optimisée pour la PWA
'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Loader2, AlertCircle } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  loading = 'lazy',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadStartTime] = useState(Date.now());
  const imageRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback(() => {
    const loadTime = Date.now() - loadStartTime;
    console.log(`📸 Image chargée en ${loadTime}ms:`, src);
    
    setIsLoading(false);
    onLoad?.();
  }, [src, loadStartTime, onLoad]);

  const handleError = useCallback(() => {
    console.error(`❌ Erreur de chargement d'image:`, src);
    setHasError(true);
    setIsLoading(false);
    onError?.();
  }, [src, onError]);

  // Placeholder SVG simple pour le blur
  const defaultBlurDataURL = `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="sans-serif" font-size="14">
        ${alt}
      </text>
    </svg>
  `)}`;

  if (hasError) {
    return (
      <div 
        className={`relative bg-gray-100 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-gray-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Image non disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Chargement...</p>
          </div>
        </div>
      )}
      
      {/* Image optimisée Next.js */}
      <Image
        ref={imageRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL || defaultBlurDataURL}
        sizes={sizes}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          objectFit: 'cover',
          width: '100%',
          height: '100%'
        }}
      />
      
      {/* Métadonnées pour les performances */}
      <meta
        itemProp="image"
        content={src}
      />
    </div>
  );
}

// Composant pour les images de produits avec lazy loading intelligent
export function ProductImage({ 
  product, 
  className = '',
  showOverlay = false 
}: {
  product: {
    id: string;
    name: string;
    image: string;
    price?: number;
    category?: string;
  };
  className?: string;
  showOverlay?: boolean;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
    
    // Précharger les images similaires si nécessaire
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Précharger d'autres images de la même catégorie
        preloadSimilarImages(product.category);
      });
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <OptimizedImage
        src={product.image}
        alt={product.name}
        width={300}
        height={200}
        quality={80}
        placeholder="blur"
        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
        onLoad={handleImageLoad}
        className="w-full h-full object-cover"
      />
      
      {/* Overlay avec informations du produit */}
      {showOverlay && imageLoaded && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <h3 className="text-white font-medium text-sm truncate">
            {product.name}
          </h3>
          {product.price && (
            <p className="text-orange-400 font-bold text-sm">
              {product.price} MAD
            </p>
          )}
        </div>
      )}
      
      {/* Badge de catégorie */}
      {product.category && (
        <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
          {product.category}
        </div>
      )}
    </div>
  );
}

// Fonction pour précharger les images similaires
function preloadSimilarImages(category?: string) {
  if (!category) return;
  
  // Logique de préchargement intelligent basée sur la catégorie
  console.log(`🖼️ Préchargement des images de catégorie: ${category}`);
}

// Composant pour les images de restaurant avec optimisation avancée
export function RestaurantImage({ 
  restaurant, 
  size = 'medium',
  className = ''
}: {
  restaurant: {
    id: string;
    name: string;
    image: string;
    rating?: number;
    deliveryTime?: string;
  };
  size?: 'small' | 'medium' | 'large';
  className?: string;
}) {
  const dimensions = {
    small: { width: 80, height: 80 },
    medium: { width: 120, height: 120 },
    large: { width: 200, height: 150 }
  };

  const { width, height } = dimensions[size];

  return (
    <div className={`relative ${className}`}>
      <OptimizedImage
        src={restaurant.image}
        alt={`Restaurant ${restaurant.name}`}
        width={width}
        height={height}
        quality={70}
        placeholder="blur"
        sizes={`${width}px`}
        className="rounded-lg object-cover"
      />
      
      {/* Badges de rating et temps de livraison */}
      <div className="absolute top-1 right-1 flex gap-1">
        {restaurant.rating && (
          <div className="bg-yellow-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
            ⭐ {restaurant.rating}
          </div>
        )}
        {restaurant.deliveryTime && (
          <div className="bg-green-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
            {restaurant.deliveryTime}
          </div>
        )}
      </div>
    </div>
  );
}

// Hook pour l'optimisation des performances d'images
export function useImageOptimization() {
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [imageMetrics, setImageMetrics] = useState<Record<string, {
    loadTime: number;
    size: number;
    format: string;
  }>>({});

  const preloadImage = useCallback((src: string, priority: 'high' | 'low' = 'low') => {
    if (preloadedImages.has(src)) return;

    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setPreloadedImages(prev => new Set(prev).add(src));
      setImageMetrics(prev => ({
        ...prev,
        [src]: {
          loadTime: Date.now(),
          size: img.naturalWidth * img.naturalHeight,
          format: getImageFormat(src)
        }
      }));
    };

    img.onerror = () => {
      console.warn(`Échec du préchargement: ${src}`);
    };

    // Préchargement avec priorité
    if (priority === 'high') {
      img.loading = 'eager';
    }
  }, [preloadedImages]);

  const preloadCriticalImages = useCallback((images: Array<{ src: string; priority: 'high' | 'low' }>) => {
    images.forEach(image => preloadImage(image.src, image.priority));
  }, [preloadImage]);

  return {
    preloadImage,
    preloadCriticalImages,
    preloadedImages,
    imageMetrics
  };
}

// Fonction utilitaire pour déterminer le format d'image
function getImageFormat(src: string): string {
  const extension = src.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'webp':
      return 'webp';
    case 'avif':
      return 'avif';
    case 'jpg':
    case 'jpeg':
      return 'jpeg';
    case 'png':
      return 'png';
    default:
      return 'unknown';
  }
}