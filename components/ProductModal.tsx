'use client';

import { useEffect, useState } from 'react';
import { X, Minus, Plus, Check, Ban } from 'lucide-react';
import Image from 'next/image';

// --- TYPES ---
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
  options_config?: OptionGroup[]; 
  ingredients?: string[];
}

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: any) => void;
  // ✅ NOUVEAU : On accepte les couleurs du brand
  brandColors?: { primary: string; secondary: string };
}

export default function ProductModal({ product, isOpen, onClose, onAddToCart, brandColors }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, OptionItem[]>>({});
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // Valeurs par défaut si non fournies
  const primary = brandColors?.primary || '#000000';
  const secondary = brandColors?.secondary || '#FFFFFF';

  // --- INIT ---
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setSelectedOptions({});
      setRemovedIngredients([]);
      
      if (product.variations && product.variations.length > 0) {
        const sorted = [...product.variations].sort((a, b) => a.price - b.price);
        setSelectedVariation(sorted[0]);
      } else {
        setSelectedVariation(null);
      }
    }
  }, [isOpen, product]);

  // --- CALCUL PRIX ---
  useEffect(() => {
    if (!product) return;

    let base = product.price;
    if (selectedVariation) {
      base = selectedVariation.price;
    }

    let optionsTotal = 0;
    Object.values(selectedOptions).forEach(items => {
      items.forEach(item => {
        optionsTotal += item.price;
      });
    });

    setTotalPrice((base + optionsTotal) * quantity);
  }, [product, selectedVariation, selectedOptions, quantity]);

  // --- HANDLERS ---
  const handleRadioSelect = (group: OptionGroup, item: OptionItem) => {
    setSelectedOptions(prev => ({ ...prev, [group.id]: [item] }));
  };

  const incrementOption = (group: OptionGroup, item: OptionItem) => {
    setSelectedOptions(prev => {
      const currentItems = prev[group.id] || [];
      if (currentItems.length < group.max) {
        return { ...prev, [group.id]: [...currentItems, item] };
      }
      return prev; 
    });
  };

  const decrementOption = (group: OptionGroup, item: OptionItem) => {
    setSelectedOptions(prev => {
      const currentItems = prev[group.id] || [];
      const indexToRemove = currentItems.findIndex(i => i.id === item.id);
      if (indexToRemove !== -1) {
        const newItems = [...currentItems];
        newItems.splice(indexToRemove, 1);
        return { ...prev, [group.id]: newItems };
      }
      return prev;
    });
  };

  const toggleIngredientRemove = (ingredient: string) => {
    setRemovedIngredients(prev => {
        if (prev.includes(ingredient)) return prev.filter(i => i !== ingredient);
        else return [...prev, ingredient];
    });
  };

  const handleAddToCartClick = () => {
    if (!product) return;

    if (product.options_config) {
        for (const group of product.options_config) {
            const currentCount = selectedOptions[group.id]?.length || 0;
            if (currentCount < group.min) {
                alert(`⚠️ "${group.name}" : Veuillez en choisir au moins ${group.min}.`);
                return;
            }
        }
    }

    onAddToCart({
      id: product.id,
      name: product.name,
      image_url: product.image_url,
      quantity,
      selectedVariation,
      selectedOptions,
      removedIngredients,
      finalPrice: totalPrice, 
      unitPrice: totalPrice / quantity
    });
    onClose();
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={onClose} />

      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 relative">
        
        {/* HEADER IMAGE */}
        <div className="relative h-56 w-full bg-gray-100 shrink-0 z-0">
            {product.image_url ? (
                <Image src={product.image_url} fill className="object-cover" alt={product.name} sizes="(max-width: 768px) 100vw, 600px"/>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-4xl">🍔</div>
            )}
            <button onClick={onClose} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-md hover:scale-110 transition active:scale-95 z-50 text-black">
                <X size={20}/>
            </button>
        </div>

        {/* CONTENU */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8 bg-white relative z-10">
            <div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">{product.name}</h2>
                <p className="text-gray-500 text-sm leading-relaxed">{product.description}</p>
            </div>

            {/* VARIANTES (TAILLES) */}
            {product.variations && product.variations.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider">Taille</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {product.variations.map((v) => {
                            const isSelected = selectedVariation?.id === v.id;
                            return (
                                <button
                                    key={v.id}
                                    onClick={() => setSelectedVariation(v)}
                                    // ✅ COULEUR DYNAMIQUE
                                    style={isSelected ? { backgroundColor: primary, color: secondary, borderColor: primary } : {}}
                                    className={`p-4 rounded-xl border text-left transition-all flex justify-between items-center ${
                                        isSelected 
                                        ? 'shadow-lg ring-2 ring-opacity-20' 
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <span className="font-bold text-sm">{v.name}</span>
                                    <span className="text-xs font-medium">{v.price} DH</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* INGRÉDIENTS */}
            {product.ingredients && product.ingredients.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider">Ingrédients (Tap pour retirer)</h3>
                    <div className="flex flex-wrap gap-2">
                        {product.ingredients.map((ing) => {
                            const isRemoved = removedIngredients.includes(ing);
                            return (
                                <button key={ing} onClick={() => toggleIngredientRemove(ing)} className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${isRemoved ? 'bg-red-50 border-red-200 text-red-600 line-through decoration-red-400 opacity-80' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                                    {isRemoved && <Ban size={12}/>}
                                    {ing}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* OPTIONS */}
            {product.options_config && product.options_config.length > 0 && (
                <div className="space-y-8 pt-4 border-t border-gray-100">
                    {product.options_config.map((group) => {
                        const currentSelected = selectedOptions[group.id] || [];
                        const currentCount = currentSelected.length;
                        const isMultiple = group.max > 1;
                        const isLimitReached = isMultiple && currentCount >= group.max;

                        return (
                            <div key={group.id} className="space-y-3">
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                                        {group.name}
                                        {isMultiple && (
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500`}>
                                                {currentCount} / {group.max}
                                            </span>
                                        )}
                                    </h3>
                                    <div className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {group.min > 0 ? <span className="text-orange-600">Obligatoire</span> : <span>Optionnel</span>}
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    {group.items.map((item) => {
                                        const qtyThisItem = currentSelected.filter(i => i.id === item.id).length;
                                        const isSelected = qtyThisItem > 0;

                                        // --- MODE MULTIPLE ---
                                        if (isMultiple) {
                                            return (
                                                <div key={item.id} className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${isSelected ? 'border-gray-300 bg-gray-50' : 'border-gray-100 bg-white'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-medium text-sm text-gray-900">{item.name}</span>
                                                        {item.price > 0 && <span className="text-xs font-bold text-gray-500">+{item.price} DH</span>}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                                                        {qtyThisItem > 0 ? (
                                                            <>
                                                                <button onClick={() => decrementOption(group, item)} className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200 transition">
                                                                    <Minus size={14}/>
                                                                </button>
                                                                <span className="font-bold text-sm w-4 text-center">{qtyThisItem}</span>
                                                            </>
                                                        ) : null}
                                                        
                                                        <button 
                                                            onClick={() => incrementOption(group, item)}
                                                            disabled={isLimitReached}
                                                            // ✅ COULEUR DYNAMIQUE POUR LE BOUTON +
                                                            style={!isLimitReached ? { backgroundColor: primary, color: secondary } : {}}
                                                            className={`w-7 h-7 flex items-center justify-center rounded transition ${isLimitReached ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : ''}`}
                                                        >
                                                            <Plus size={14}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        } 
                                        
                                        // --- MODE RADIO ---
                                        else {
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleRadioSelect(group, item)}
                                                    // ✅ BORDURE ET FOND DYNAMIQUE SI SÉLECTIONNÉ
                                                    style={isSelected ? { borderColor: primary, backgroundColor: `${primary}15` } : {}}
                                                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all active:scale-[0.98] ${
                                                        isSelected ? '' : 'border-gray-100 bg-white hover:border-gray-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {/* ROND RADIO DYNAMIQUE */}
                                                        <div 
                                                            style={isSelected ? { backgroundColor: primary, borderColor: primary } : {}}
                                                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                                                                isSelected ? '' : 'border-gray-300 bg-white'
                                                            }`}
                                                        >
                                                            {isSelected && <Check size={12} className="text-white"/>}
                                                        </div>
                                                        
                                                        {/* TEXTE COLORÉ SI SÉLECTIONNÉ */}
                                                        <span style={isSelected ? { color: primary } : {}} className="font-medium text-sm text-gray-900">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    {item.price > 0 && <span className="text-xs font-bold text-gray-600">+{item.price} DH</span>}
                                                </button>
                                            );
                                        }
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-gray-100 bg-white shrink-0 safe-area-bottom z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-100 rounded-full p-1">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm hover:scale-105 active:scale-95 transition disabled:opacity-50" disabled={quantity <= 1}><Minus size={16}/></button>
                    <span className="font-black text-lg w-10 text-center tabular-nums">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm hover:scale-105 active:scale-95 transition"><Plus size={16}/></button>
                </div>
                
                {/* ✅ BOUTON AJOUTER DYNAMIQUE */}
                <button 
                    onClick={handleAddToCartClick}
                    style={{ backgroundColor: primary, color: secondary }}
                    className="flex-1 py-4 rounded-full font-bold text-lg hover:opacity-90 active:scale-[0.98] transition shadow-xl flex justify-between px-8 items-center"
                >
                    <span>Ajouter</span>
                    <span className="tabular-nums">{totalPrice.toFixed(2)} DH</span>
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}