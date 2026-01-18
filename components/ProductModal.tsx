'use client';

import { useEffect, useState, useMemo } from 'react';
import { X, Minus, Plus, Check, Ban, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
// 👇 IMPORT DYNAMIQUE POUR ÉVITER LE CRASH SSR (Important !)
import dynamic from 'next/dynamic';

// On charge le visualiseur 3D uniquement côté client
const FoodViewer3D = dynamic(() => import('@/components/experience/FoodViewer3D'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center animate-pulse">
      <span className="text-xs text-gray-400 font-medium">Chargement visuel...</span>
    </div>
  ),
});

// --- TYPES (Identiques à votre logique métier) ---
interface Variation {
  id: string;
  name: string;
  price: number;
}

interface OptionItem {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

interface OptionGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  items: OptionItem[];
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  type: 'simple' | 'variable' | 'combo';
  variations?: Variation[];
  options_config?: any; // On garde any pour la flexibilité du JSONB, ou OptionGroup[] si typé
  ingredients?: string[];
}

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: any) => void;
  brandColors?: { primary: string; secondary: string };
}

export default function ProductModal({ product, isOpen, onClose, onAddToCart, brandColors }: ProductModalProps) {
  // --- STATE ---
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, OptionItem[]>>({});
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [isClosing, setIsClosing] = useState(false);

  // --- BRANDING ---
  const primaryColor = brandColors?.primary || '#000000';
  const secondaryColor = brandColors?.secondary || '#FFFFFF';

  // --- INIT & RESET ---
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setSelectedOptions({});
      setRemovedIngredients([]);
      setIsClosing(false);

      if (product.variations && product.variations.length > 0) {
        const sorted = [...product.variations].sort((a, b) => a.price - b.price);
        setSelectedVariation(sorted[0]);
      } else {
        setSelectedVariation(null);
      }
    }
  }, [isOpen, product]);

  // --- VALIDATION EN TEMPS RÉEL (Logique métier conservée) ---
  const validationState = useMemo(() => {
    // Cast sécurisé des options
    const optionsGroups = (product?.options_config as OptionGroup[]) || [];
    if (!optionsGroups.length) return { isValid: true, missingGroups: [] };

    const missingGroups: string[] = [];
    let isValid = true;

    optionsGroups.forEach(group => {
      const currentCount = selectedOptions[group.id]?.length || 0;
      if (currentCount < group.min) {
        isValid = false;
        missingGroups.push(group.id);
      }
    });

    return { isValid, missingGroups };
  }, [product, selectedOptions]);

  // --- CALCUL PRIX TOTAL ---
  const totalPrice = useMemo(() => {
    if (!product) return 0;
    
    let base = selectedVariation ? selectedVariation.price : product.price;
    
    let optionsTotal = 0;
    Object.values(selectedOptions).flat().forEach(opt => {
      optionsTotal += opt.price;
    });

    return (base + optionsTotal) * quantity;
  }, [product, selectedVariation, selectedOptions, quantity]);

  // --- HANDLERS ---
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const toggleIngredient = (ingredient: string) => {
    setRemovedIngredients(prev => {
      if (prev.includes(ingredient)) {
        return prev.filter(i => i !== ingredient);
      } else {
        return [...prev, ingredient];
      }
    });
  };

  const handleOptionSelect = (group: OptionGroup, item: OptionItem, method: 'add' | 'remove' | 'set') => {
    setSelectedOptions(prev => {
      const currentSelection = prev[group.id] || [];
      
      if (group.max === 1) {
        return { ...prev, [group.id]: [item] };
      }

      if (method === 'add') {
        if (currentSelection.length >= group.max) return prev;
        return { ...prev, [group.id]: [...currentSelection, item] };
      }

      if (method === 'remove') {
        const idx = currentSelection.findIndex(i => i.id === item.id);
        if (idx === -1) return prev;
        const newSelection = [...currentSelection];
        newSelection.splice(idx, 1);
        return { ...prev, [group.id]: newSelection };
      }

      return prev;
    });
  };

  const handleAddToCartClick = () => {
    if (!product || !validationState.isValid) return;

    onAddToCart({
      id: product.id,
      name: product.name,
      image_url: product.image_url,
      quantity,
      selectedVariation,
      selectedOptions,
      removedIngredients,
      totalPrice: totalPrice,
      unitPrice: totalPrice / quantity,
      instructions: removedIngredients.length > 0 ? `Sans: ${removedIngredients.join(', ')}` : ''
    });
    handleClose();
  };

  if (!isOpen || !product) return null;

  // 🧠 Logique Futuriste : Extraction du modèle 3D depuis options_config ou un champ dédié
  // On suppose ici que options_config peut contenir une clé spéciale "meta_3d" ou on utilise une convention
  // Pour l'instant, on cherche dans options_config si c'est un tableau, sinon on regarde si c'est un objet JSON
  // Note: Dans votre schéma DB, options_config est JSONB. Adaptez selon votre structure réelle.
  const model3DUrl = (product as any).model_3d_url || null; // Si vous ajoutez le champ un jour
  // OU : const model3DUrl = "https://mon-bucket.com/burger.glb"; // Pour tester en dur

  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-none",
      isClosing ? "opacity-0 transition-opacity duration-300" : "opacity-100"
    )}>
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={handleClose} 
      />

      <div className={cn(
        "bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] pointer-events-auto relative transform transition-all duration-300",
        isClosing ? "translate-y-full sm:scale-95 sm:translate-y-10" : "translate-y-0 sm:scale-100"
      )}>
        
        {/* 🔥 HEADER HYBRIDE : 3D avec Fallback Image géré par FoodViewer3D */}
        <div className="relative h-72 w-full bg-gray-100 shrink-0">
            <FoodViewer3D 
                modelUrl={model3DUrl} 
                imageUrl={product.image_url} 
                alt={product.name}
                className="h-full w-full rounded-none" // On écrase le style par défaut pour coller au header
            />
            
            {/* Bouton Fermer (Overlay) */}
            <button 
              onClick={handleClose} 
              className="absolute top-4 right-4 bg-white/80 backdrop-blur text-black p-2 rounded-full shadow-lg hover:scale-110 active:scale-95 transition z-30"
            >
                <X size={20} />
            </button>
        </div>

        {/* 2. CONTENU SCROLLABLE (Logique Métier Intacte) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white custom-scrollbar">
            
            {/* Info Produit */}
            <div>
                <div className="flex justify-between items-start mb-2">
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">{product.name}</h2>
                    {!product.variations?.length && (
                      <span className="text-lg font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                        {product.price} DH
                      </span>
                    )}
                </div>
                {product.description && (
                  <p className="text-gray-500 text-sm leading-relaxed">{product.description}</p>
                )}
            </div>

            {/* A. VARIANTES */}
            {product.variations && product.variations.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider">Choisissez votre taille</h3>
                    <div className="space-y-2">
                        {product.variations.map((v) => {
                            const isSelected = selectedVariation?.id === v.id;
                            return (
                                <button
                                    key={v.id}
                                    onClick={() => setSelectedVariation(v)}
                                    className={cn(
                                      "w-full p-4 rounded-xl border flex justify-between items-center transition-all duration-200 group",
                                      isSelected ? "border-transparent ring-2 ring-offset-1 bg-gray-50/50" : "border-gray-200 hover:border-gray-300 bg-white"
                                    )}
                                    style={isSelected ? { 
                                      boxShadow: `0 0 0 2px ${primaryColor} inset`,
                                      backgroundColor: `${primaryColor}08`
                                    } : {}}
                                >
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className={cn(
                                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                          isSelected ? "border-transparent" : "border-gray-300"
                                        )}
                                        style={isSelected ? { backgroundColor: primaryColor } : {}}
                                      >
                                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                      </div>
                                      <span className={cn("font-semibold text-base", isSelected ? "text-gray-900" : "text-gray-600")}>
                                        {v.name}
                                      </span>
                                    </div>
                                    <span className="font-bold text-gray-900">{v.price} DH</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* B. INGRÉDIENTS */}
            {product.ingredients && product.ingredients.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider flex justify-between">
                      Ingrédients
                      <span className="text-[10px] normal-case bg-gray-100 px-2 py-0.5 rounded text-gray-500">Tap pour retirer</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {product.ingredients.map((ing) => {
                            const isRemoved = removedIngredients.includes(ing);
                            return (
                                <button 
                                  key={ing} 
                                  onClick={() => toggleIngredient(ing)} 
                                  className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2",
                                    isRemoved 
                                      ? "bg-red-50 border-red-200 text-red-500 line-through decoration-red-400/50 opacity-70" 
                                      : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                  )}
                                >
                                    {isRemoved ? <Ban size={14} /> : <Check size={14} className="text-green-500" />}
                                    {ing}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* C. OPTIONS */}
            {product.options_config && Array.isArray(product.options_config) && product.options_config.length > 0 && (
                <div className="space-y-8 pt-6 border-t border-gray-100">
                    {(product.options_config as OptionGroup[]).map((group) => {
                        const currentSelection = selectedOptions[group.id] || [];
                        const currentCount = currentSelection.length;
                        const isMultiple = group.max > 1;
                        const isSatisfied = currentCount >= group.min;
                        const isMissing = !isSatisfied && validationState.missingGroups.includes(group.id);

                        return (
                            <div key={group.id} className={cn("space-y-3 rounded-xl p-1 transition-colors", isMissing && "bg-red-50/50 -mx-1 px-1")}>
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <h3 className={cn("font-bold text-base flex items-center gap-2", isMissing ? "text-red-600" : "text-gray-900")}>
                                          {group.name}
                                          {isMissing && <AlertCircle size={14} className="text-red-500 animate-pulse"/>}
                                      </h3>
                                      <span className="text-xs text-gray-500">
                                        {isMultiple ? `Max ${group.max} choix` : "1 choix"}
                                      </span>
                                    </div>
                                    <div className={cn(
                                      "text-[10px] uppercase font-bold px-2 py-1 rounded border",
                                      group.min > 0 
                                        ? (isSatisfied ? "bg-green-50 text-green-700 border-green-200" : "bg-orange-50 text-orange-700 border-orange-200")
                                        : "bg-gray-100 text-gray-500 border-transparent"
                                    )}>
                                        {group.min > 0 ? (isSatisfied ? "OK" : `Requis`) : "Optionnel"}
                                    </div>
                                </div>
                                
                                <div className="grid gap-2">
                                    {group.items.map((item) => {
                                        const qtyThisItem = currentSelection.filter(i => i.id === item.id).length;
                                        const isSelected = qtyThisItem > 0;
                                        const isMaxReached = currentCount >= group.max;

                                        // LOGIQUE AFFICHAGE (Radio vs Checkbox)
                                        if (group.max === 1) {
                                          return (
                                            <button
                                              key={item.id}
                                              onClick={() => handleOptionSelect(group, item, 'set')}
                                              className={cn(
                                                "w-full p-3 rounded-lg border flex items-center justify-between transition-all active:scale-[0.99]",
                                                isSelected ? "bg-white ring-1 ring-offset-0" : "bg-white border-gray-100 hover:bg-gray-50"
                                              )}
                                              style={isSelected ? { borderColor: primaryColor, boxShadow: `0 0 0 1px ${primaryColor} inset` } : {}}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div 
                                                      className={cn("w-4 h-4 rounded-full border flex items-center justify-center", isSelected ? "border-transparent" : "border-gray-300")}
                                                      style={isSelected ? { backgroundColor: primaryColor } : {}}
                                                    >
                                                      {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                                </div>
                                                {item.price > 0 && <span className="text-xs font-semibold text-gray-500">+{item.price} DH</span>}
                                            </button>
                                          );
                                        }

                                        return (
                                            <div key={item.id} className={cn(
                                              "w-full p-3 rounded-lg border flex items-center justify-between transition-all",
                                              isSelected ? "border-gray-300 bg-gray-50" : "border-gray-100 bg-white"
                                            )}>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                                    {item.price > 0 && <span className="text-xs text-gray-500">+{item.price} DH</span>}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {qtyThisItem > 0 && (
                                                      <>
                                                        <button 
                                                          onClick={() => handleOptionSelect(group, item, 'remove')}
                                                          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                                                        >
                                                          <Minus size={14}/>
                                                        </button>
                                                        <span className="font-bold text-sm w-4 text-center">{qtyThisItem}</span>
                                                      </>
                                                    )}
                                                    <button 
                                                        onClick={() => handleOptionSelect(group, item, 'add')}
                                                        disabled={isMaxReached}
                                                        className={cn(
                                                          "w-8 h-8 flex items-center justify-center rounded-lg text-white shadow-sm transition",
                                                          isMaxReached ? "bg-gray-200 cursor-not-allowed opacity-50" : "hover:opacity-90"
                                                        )}
                                                        style={!isMaxReached ? { backgroundColor: primaryColor } : {}}
                                                    >
                                                        <Plus size={14}/>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* 3. FOOTER ACTIONS */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-white shrink-0 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 relative">
            <div className="flex gap-4 h-14">
                <div className="flex items-center bg-gray-100 rounded-2xl px-2 shrink-0">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                      disabled={quantity <= 1}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:scale-105 active:scale-95 transition disabled:opacity-50"
                    >
                      <Minus size={18}/>
                    </button>
                    <span className="font-bold text-xl w-12 text-center tabular-nums text-gray-900">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)} 
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:scale-105 active:scale-95 transition"
                    >
                      <Plus size={18}/>
                    </button>
                </div>
                
                <button 
                    onClick={handleAddToCartClick}
                    disabled={!validationState.isValid}
                    style={{ 
                      backgroundColor: validationState.isValid ? primaryColor : '#E5E7EB', 
                      color: validationState.isValid ? secondaryColor : '#9CA3AF'
                    }}
                    className={cn(
                      "flex-1 rounded-2xl font-bold text-lg transition-all duration-300 flex justify-between px-6 items-center shadow-lg",
                      validationState.isValid ? "hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]" : "cursor-not-allowed shadow-none"
                    )}
                >
                    <span className="flex flex-col items-start leading-none gap-1">
                      <span>{validationState.isValid ? "Ajouter" : "Incomplet"}</span>
                      {!validationState.isValid && <span className="text-[10px] opacity-80 font-normal">Options requises</span>}
                    </span>
                    <span className="tabular-nums opacity-90">{totalPrice.toFixed(2)} DH</span>
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}