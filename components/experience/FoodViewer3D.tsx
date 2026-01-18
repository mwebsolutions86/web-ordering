'use client';

import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Stage, PresentationControls, Html } from '@react-three/drei';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// --- 1. COMPOSANT DE CHARGEMENT ---
const Loader = () => (
  <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50/50 backdrop-blur-sm">
    <div className="relative h-10 w-10">
      <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 opacity-75"></div>
      <div className="absolute inset-2 animate-spin rounded-full border-t-2 border-primary border-r-transparent"></div>
    </div>
    <span className="mt-3 text-xs font-medium tracking-widest text-primary/80 uppercase animate-pulse">
      Chargement 3D...
    </span>
  </div>
);

// --- 2. BARRIÈRE DE SÉCURITÉ (ERROR BOUNDARY) ---
// Capture les crashs de Three.js pour ne pas casser l'app
class ThreeErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error("⚠️ 3D Context Crash:", error);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// --- 3. MODÈLE 3D INTERNE ---
const Model = ({ url, onError }: { url: string; onError: () => void }) => {
  const ref = useRef<any>();
  
  // Gestion d'erreur de chargement GLTF
  try {
    const { scene } = useGLTF(url);
    
    // Rotation automatique douce
    useFrame(() => {
      if (ref.current) {
        ref.current.rotation.y += 0.002;
      }
    });

    return <primitive object={scene} ref={ref} />;
  } catch (e) {
    console.error("Erreur chargement GLTF:", e);
    onError(); // Déclenche le fallback 2D
    return null;
  }
};

// --- 4. COMPOSANT PRINCIPAL ---
interface FoodViewer3DProps {
  modelUrl?: string | null;
  imageUrl?: string | null;
  alt: string;
  className?: string;
}

export default function FoodViewer3D({
  modelUrl,
  imageUrl,
  alt,
  className,
}: FoodViewer3DProps) {
  const [is3DEnabled, setIs3DEnabled] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Éviter les problèmes d'hydratation (SSR)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fonction pour désactiver la 3D en cas de pépin
  const handle3DError = () => {
    setHasError(true);
    setIs3DEnabled(false);
  };

  // Rendu FALLBACK (Image 2D)
  const render2D = () => (
    <div className={cn('relative h-[350px] w-full overflow-hidden bg-gray-100', className)}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-cover transition-transform duration-700 hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      ) : (
        <div className="flex h-full items-center justify-center text-gray-400">
          Aucun visuel disponible
        </div>
      )}
      
      {/* Bouton pour réessayer la 3D si disponible et pas d'erreur critique */}
      {modelUrl && !hasError && (
        <button
          onClick={() => setIs3DEnabled(true)}
          className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-black shadow-lg backdrop-blur-md transition hover:bg-white hover:scale-105"
        >
          <span>Activer 3D</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
          </svg>
        </button>
      )}
    </div>
  );

  // Si pas monté, pas d'URL, 3D désactivée ou erreur -> Afficher 2D
  if (!isMounted || !modelUrl || !is3DEnabled || hasError) {
    return render2D();
  }

  return (
    <div className={cn('relative h-[350px] w-full overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950', className)}>
      
      {/* ERROR BOUNDARY : Capture les crashs internes du Canvas */}
      <ThreeErrorBoundary fallback={render2D()}>
        <Canvas dpr={[1, 2]} camera={{ fov: 45 }} shadows>
          <Suspense
            fallback={
              <Html center>
                <Loader />
              </Html>
            }
          >
            <PresentationControls
              speed={1.5}
              global
              zoom={0.7}
              polar={[-0.1, Math.PI / 4]}
            >
              <Stage environment="city" intensity={0.5} shadows={false}>
                <Model url={modelUrl} onError={handle3DError} />
              </Stage>
            </PresentationControls>
          </Suspense>
        </Canvas>
      </ThreeErrorBoundary>

      {/* Interface Overlay (Boutons de contrôle) */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setIs3DEnabled(false)}
          className="rounded-full bg-white/50 p-2 text-black transition hover:bg-white shadow-sm backdrop-blur-sm"
          title="Retourner à l'image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
      </div>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
         <div className="flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 backdrop-blur-md dark:bg-white/10">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/60 dark:text-white/80">
               Vue Interactive
            </span>
         </div>
      </div>
    </div>
  );
}