"use client";

import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Ban, Check, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/lib/store';

// Types
type OptionItem = {
  id: string;
  name: string;
  price: number;
};

type OptionGroup = {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  min: number; // Nombre min de sélections (Si > 0, c'est obligatoire)
  max: number;
  items?: OptionItem[];
};

type Product = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  ingredients: string[] | null;
  options_config: any;
};

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const { addItem } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, OptionItem[]>>({});
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [missingGroups, setMissingGroups] = useState<string[]>([]); // Pour suivre les erreurs

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setSelectedOptions({});
      setRemovedIngredients([]);
      setMissingGroups([]);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Parsing sécurisé
  const optionGroups: OptionGroup[] = Array.isArray(product.options_config) 
    ? product.options_config 
    : [];

  // --- VALIDATION EN TEMPS RÉEL ---
  const validateGroups = () => {
    const missing: string[] = [];
    optionGroups.forEach(group => {
        const currentCount = (selectedOptions[group.id] || []).length;
        // Si un minimum est requis et qu'on ne l'a pas atteint
        if (group.min > 0 && currentCount < group.min) {
            missing.push(group.id);
        }
    });
    return missing;
  };

  const isFormValid = validateGroups().length === 0;

  const handleOptionSelect = (group: OptionGroup, item: OptionItem) => {
    setSelectedOptions(prev => {
      const currentSelection = prev[group.id] || [];
      
      if (group.type === 'single') {
        // Radio : On remplace tout
        return { ...prev, [group.id]: [item] };
      } else {
        // Checkbox : Toggle
        const exists = currentSelection.find(i => i.id === item.id);
        let newSelection;
        
        if (exists) {
            // Désélectionner
            newSelection = currentSelection.filter(i => i.id !== item.id);
        } else {
            // Sélectionner (si max non atteint)
            if (currentSelection.length < group.max) {
                newSelection = [...currentSelection, item];
            } else {
                // Optionnel : Notification ou effet visuel si max atteint
                return prev; 
            }
        }
        return { ...prev, [group.id]: newSelection };
      }
    });
  };

  const toggleIngredient = (ing: string) => {
    setRemovedIngredients(prev => 
      prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]
    );
  };

  const calculateTotal = () => {
    let total = product.price;
    Object.values(selectedOptions).flat().forEach(opt => {
        total += (opt.price || 0);
    });
    return total * quantity;
  };

  const handleAddToCart = () => {
    // Ultime validation avant envoi
    const errors = validateGroups();
    if (errors.length > 0) {
        setMissingGroups(errors); // Affiche les erreurs visuellement si besoin
        // Scroll vers le premier groupe manquant (optionnel)
        const element = document.getElementById(`group-${errors[0]}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const flatOptions = Object.values(selectedOptions).flat();
    
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      finalPrice: calculateTotal() / quantity,
      quantity,
      selectedOptions: flatOptions,
      removedIngredients,
      image_url: product.image_url
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden relative flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Image */}
        <div className="relative h-48 sm:h-64 bg-gray-100 shrink-0">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
                <span className="text-4xl">🍔</span>
            </div>
          )}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-sm hover:bg-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex justify-between items-start">
                <h2 className="text-2xl font-black text-gray-900">{product.name}</h2>
                <span className="text-xl font-bold text-orange-600">{product.price} DH</span>
            </div>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">{product.description}</p>
          </div>

          {/* Ingrédients */}
          {product.ingredients && product.ingredients.length > 0 && (
            <div>
                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Ingrédients <span className="text-gray-400 font-normal">(Cliquer pour retirer)</span></h3>
                <div className="flex flex-wrap gap-2">
                    {product.ingredients.map((ing, idx) => {
                        const isRemoved = removedIngredients.includes(ing);
                        return (
                            <button
                                key={idx}
                                onClick={() => toggleIngredient(ing)}
                                className={`
                                    px-3 py-1.5 rounded-full text-sm font-medium border transition-all flex items-center gap-2
                                    ${isRemoved 
                                        ? 'bg-red-50 border-red-200 text-red-600 line-through decoration-red-600' 
                                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}
                                `}
                            >
                                {isRemoved && <Ban size={12} />}
                                {ing}
                            </button>
                        )
                    })}
                </div>
            </div>
          )}

          {/* Options Groups */}
          {optionGroups.map(group => {
            const currentCount = (selectedOptions[group.id] || []).length;
            const isSatisfied = group.min === 0 || currentCount >= group.min;
            
            return (
                <div key={group.id} id={`group-${group.id}`} className={`border-t pt-6 ${!isSatisfied ? 'border-red-100' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex flex-col">
                            <h3 className={`font-bold text-lg ${!isSatisfied ? 'text-red-600' : 'text-gray-900'}`}>
                                {group.name}
                            </h3>
                            {/* Indicateur de validation */}
                            <div className="flex gap-2 mt-1">
                                {group.min > 0 && (
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isSatisfied ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {isSatisfied ? 'Choix validé' : `Requis : ${group.min}`}
                                    </span>
                                )}
                                {group.max > 1 && (
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                                        Max : {group.max}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {(group.items || []).map(item => {
                            const isSelected = selectedOptions[group.id]?.some(i => i.id === item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleOptionSelect(group, item)}
                                    className={`
                                        w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left
                                        ${isSelected 
                                            ? 'border-orange-500 bg-orange-50 text-orange-900 ring-1 ring-orange-500' 
                                            : 'border-gray-100 hover:border-gray-200 bg-white'}
                                    `}
                                >
                                    <span className="font-medium">{item.name}</span>
                                    <div className="flex items-center gap-3">
                                        {item.price > 0 && <span className="text-sm text-gray-500">+{item.price} DH</span>}
                                        <div className={`
                                            w-5 h-5 rounded-full border flex items-center justify-center
                                            ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}
                                        `}>
                                            {isSelected && <Check size={12} className="text-white" />}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0">
            <div className="flex items-center gap-4">
                <div className="flex items-center bg-white border border-gray-200 rounded-xl h-14">
                    <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-12 h-full flex items-center justify-center text-gray-500 hover:text-black active:bg-gray-50 rounded-l-xl transition"
                    >
                        <Minus size={20} />
                    </button>
                    <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                    <button 
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-12 h-full flex items-center justify-center text-gray-500 hover:text-black active:bg-gray-50 rounded-r-xl transition"
                    >
                        <Plus size={20} />
                    </button>
                </div>
                
                <button
                    onClick={handleAddToCart}
                    disabled={!isFormValid} // Désactivé si formulaire invalide
                    className={`
                        flex-1 h-14 rounded-xl font-bold text-lg transition shadow-lg flex items-center justify-center gap-2
                        ${isFormValid 
                            ? 'bg-black hover:bg-gray-800 text-white shadow-gray-200 active:scale-95' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}
                    `}
                >
                    {isFormValid ? (
                        <>
                            <span>Ajouter</span>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                                {calculateTotal().toFixed(2)} DH
                            </span>
                        </>
                    ) : (
                        <span className="flex items-center gap-2">
                            <AlertCircle size={18} />
                            Options requises
                        </span>
                    )}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}