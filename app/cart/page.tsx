"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/store';
import { ShoppingBag, Trash2, ArrowLeft, Loader2, CheckCircle, Ban, Utensils, ShoppingBag as BagIcon, Bike } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STORE_ID } from '@/lib/constants';

export default function CartPage() {
  const { items, removeItem, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  
  // --- ÉTATS DU STORE & BRANDING ---
  const [storeDeliveryFee, setStoreDeliveryFee] = useState(0); 
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('delivery');
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' });

  useEffect(() => {
    setMounted(true);
    
    const fetchStoreSettings = async () => {
        const { data, error } = await supabase
            .from('stores')
            .select('delivery_fees, primary_color, secondary_color')
            .eq('id', STORE_ID)
            .single();
        
        if (data && !error) {
            setStoreDeliveryFee(data.delivery_fees || 0);
            if (data.primary_color) setPrimaryColor(data.primary_color);
            if (data.secondary_color) setSecondaryColor(data.secondary_color);
        }
    };
    fetchStoreSettings();
  }, []);

  // ✅ HELPER : Fonction pour regrouper les options (Backend Logic)
  const getGroupedOptions = (selectedOptions: any) => {
    if (!selectedOptions) return [];
    
    // 1. On aplatit tout (car c'est stocké par groupe dans le store)
    const flatOptions = Object.values(selectedOptions).flat() as any[];
    
    // 2. On compte les occurrences
    const counts = flatOptions.reduce((acc: any, opt: any) => {
        const key = opt.id || opt.name;
        if (!acc[key]) {
            acc[key] = { ...opt, count: 0 };
        }
        acc[key].count += 1;
        return acc;
    }, {});

    return Object.values(counts);
  };

  if (!mounted) return null;

  // Calcul dynamique
  const cartTotal = items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  const applicableDeliveryFee = orderType === 'delivery' ? storeDeliveryFee : 0;
  const finalTotal = cartTotal + applicableDeliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    if (!formData.name || !formData.phone) {
        alert("Merci de remplir votre nom et téléphone.");
        return;
    }
    if (orderType === 'delivery' && !formData.address) {
        alert("L'adresse est obligatoire pour une livraison.");
        return;
    }

    setIsSubmitting(true);

    try {
      // ✅ CORRECTION APPLIQUÉE ICI : Mapping JSON strict pour le POS
      const secureItems = items.map(item => ({
        product_id: item.id,
        product_name: item.name, 
        quantity: item.quantity,
        unit_price: item.unitPrice, 
        total_price: item.unitPrice * item.quantity,
        
        // Structure JSON attendue par le POS (OrderUI.tsx)
        options: {
            variation: item.selectedVariation || null,
            // Clé 'options' et non 'selectedOptions'
            options: item.selectedOptions ? Object.values(item.selectedOptions).flat() : [],
            // Clé snake_case 'removed_ingredients'
            removed_ingredients: item.removedIngredients || [],
            // Ajout de la note si présente
            note: item.note || ''
        }
      }));

      const { data, error } = await supabase.rpc('create_order_secure', {
        p_store_id: STORE_ID,
        p_customer_name: formData.name,
        p_customer_phone: formData.phone,
        p_delivery_address: orderType === 'delivery' ? formData.address : `[${orderType.toUpperCase()}]`,
        p_order_type: orderType,
        p_items: secureItems,
        p_notes: formData.notes,
        //total_amount: finalTotal,
      });

      if (error) throw error;

      clearCart();
      setOrderComplete(true);
      
    } catch (error: any) {
      console.error(error);
      alert("Erreur : " + (error.message || "Inconnue"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gray-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full flex flex-col items-center animate-in zoom-in-95 duration-300">
            <CheckCircle style={{ color: primaryColor }} className="w-16 h-16 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">C'est validé !</h1>
            <p className="text-gray-500 mt-2 mb-8">Votre commande a bien été transmise au restaurant.</p>
            <Link 
                href="/" 
                style={{ backgroundColor: primaryColor, color: secondaryColor }}
                className="w-full py-4 rounded-xl font-bold block hover:opacity-90 transition"
            >
                Retour au menu
            </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShoppingBag size={48} className="text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-8 text-gray-900">Votre panier est vide</h1>
        <Link 
            href="/" 
            style={{ backgroundColor: primaryColor, color: secondaryColor }}
            className="px-8 py-3 rounded-full font-semibold hover:opacity-90 transition shadow-lg"
        >
            Voir le menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32 font-sans">
      <div className="flex items-center mb-8">
        <Link href="/" className="mr-4 p-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={24} className="text-gray-700" />
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-900">Mon Panier</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SÉLECTEUR DE TYPE (COULEURS DYNAMIQUES) */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Mode de retrait</h2>
            <div className="grid grid-cols-3 gap-3">
                {[
                    { type: 'dine_in', label: 'Sur Place', icon: Utensils },
                    { type: 'takeaway', label: 'A Emporter', icon: BagIcon },
                    { type: 'delivery', label: 'Livraison', icon: Bike }
                ].map((mode) => {
                    const isActive = orderType === mode.type;
                    const Icon = mode.icon;
                    return (
                        <button 
                            key={mode.type}
                            type="button"
                            onClick={() => setOrderType(mode.type as any)}
                            style={isActive ? { backgroundColor: primaryColor, borderColor: primaryColor, color: secondaryColor } : {}}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                isActive 
                                ? '' 
                                : 'border-gray-100 hover:border-gray-200 text-gray-600 bg-white'
                            }`}
                        >
                            <Icon size={20} />
                            <span className="text-xs font-bold">{mode.label}</span>
                        </button>
                    )
                })}
            </div>
          </div>

          {/* LISTE DES ARTICLES */}
          <div className="space-y-4">
            {items.map((item) => {
                // ✅ Utilisation du Helper pour l'affichage groupé
                const groupedOptions = getGroupedOptions(item.selectedOptions);

                return (
                <div key={item.cartId} className="bg-white border border-gray-100 rounded-2xl p-5 flex justify-between items-start shadow-sm">
                <div className="flex-1">
                    <div className='flex items-center gap-2'>
                        <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                        {item.selectedVariation && (
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 uppercase">
                                {item.selectedVariation.name}
                            </span>
                        )}
                    </div>

                    {/* ✅ Affichage Options Groupées (2x Mayo...) */}
                    {groupedOptions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {groupedOptions.map((opt: any, idx: number) => (
                                <span key={idx} className="text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                                    {opt.count > 1 ? `${opt.count}x ` : '+ '}
                                    {opt.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Sans Ingrédients */}
                    {item.removedIngredients && item.removedIngredients.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {item.removedIngredients.map((ing: string, idx: number) => (
                                <span key={idx} className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100 flex items-center gap-1 w-fit">
                                    <Ban size={10} /> Sans {ing}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 font-medium">
                        <p>Qté: {item.quantity}</p>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <p style={{ color: primaryColor }} className="font-bold text-base">{(item.unitPrice * item.quantity).toFixed(2)} DH</p>
                    </div>
                </div>

                <button 
                    onClick={() => removeItem(item.cartId)} 
                    className="p-2 -mr-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                    <Trash2 size={20} />
                </button>
                </div>
            )})}
          </div>

          {/* FORMULAIRE */}
          <form id="orderForm" onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vos Coordonnées</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                    type="text" 
                    placeholder="Nom complet" 
                    required 
                    className="w-full p-4 bg-gray-50 border-transparent focus:bg-white focus:border-black focus:ring-0 rounded-xl transition font-medium" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                />
                <input 
                    type="tel" 
                    placeholder="Téléphone" 
                    required 
                    className="w-full p-4 bg-gray-50 border-transparent focus:bg-white focus:border-black focus:ring-0 rounded-xl transition font-medium" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
            </div>
            
            {orderType === 'delivery' && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                    <textarea 
                        placeholder="Adresse de livraison précise..." 
                        required 
                        rows={2}
                        className="w-full p-4 bg-gray-50 border-transparent focus:bg-white focus:border-black focus:ring-0 rounded-xl transition font-medium resize-none" 
                        value={formData.address} 
                        onChange={e => setFormData({...formData, address: e.target.value})} 
                    />
                </div>
            )}

            <textarea 
                placeholder="Instructions pour la cuisine..." 
                rows={2}
                className="w-full p-4 bg-gray-50 border-transparent focus:bg-white focus:border-black focus:ring-0 rounded-xl transition font-medium resize-none" 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
            />
          </form>
        </div>

        {/* COLONNE DROITE : Résumé */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 sticky top-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Résumé</h2>
            <div className="space-y-4 mb-8 text-gray-600 font-medium">
              <div className="flex justify-between"><span>Sous-total</span><span>{cartTotal.toFixed(2)} DH</span></div>
              
              <div className="flex justify-between items-center">
                  <span>Frais de livraison</span>
                  {orderType === 'delivery' ? (
                      <span>{storeDeliveryFee.toFixed(2)} DH</span>
                  ) : (
                      <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded text-xs">OFFERT</span>
                  )}
              </div>

              <div className="border-t border-dashed border-gray-200 pt-4 flex justify-between items-center text-black">
                <span className="font-bold text-lg">Total Estimé</span>
                <span className="font-black text-2xl">{finalTotal.toFixed(2)} DH</span>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">*Paiement en espèces à la réception</p>
            </div>
            
            <button 
                form="orderForm" 
                type="submit" 
                disabled={isSubmitting} 
                style={{ backgroundColor: primaryColor, color: secondaryColor }}
                className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:opacity-90"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Commander"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}