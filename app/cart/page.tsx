"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/store';
import { ShoppingBag, Trash2, ArrowLeft, Loader2, CheckCircle, Ban } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STORE_ID } from '@/lib/constants';

export default function CartPage() {
  // On utilise removeItem qui attend maintenant un cartId (plus fiable)
  const { items, removeItem, clearCart, total } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  // Hydration fix pour Next.js (éviter mismatch serveur/client sur le localStorage)
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const cartTotal = total();
  const deliveryFee = 15;
  const finalTotal = cartTotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsSubmitting(true);

    try {
      // 1. Insertion de la commande principale (Table 'orders')
      // On utilise l'insertion directe pour éviter les problèmes de RPC non mis à jour
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            store_id: STORE_ID,
            total_amount: finalTotal,
            delivery_fee_applied: deliveryFee,
            status: 'pending',
            order_type: 'delivery',
            payment_method: 'cash',
            payment_status: 'pending',
            delivery_address: formData.address,
            customer_name: formData.name,
            customer_phone: formData.phone
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Préparation et Insertion des lignes (Table 'order_items')
      // C'est ici qu'on envoie la structure JSON compatible avec l'Admin Panel
      const itemsPayload = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.finalPrice, // Prix incluant les options
        product_name: item.name,
        // Structure JSON structurée :
        options: {
            selectedOptions: item.selectedOptions || [],
            removedIngredients: item.removedIngredients || []
        }
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

      // Succès !
      clearCart();
      setOrderComplete(true);
      
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      alert("Erreur lors de la commande : " + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Écran de succès
  if (orderComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gray-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full flex flex-col items-center">
            <CheckCircle className="text-green-600 w-16 h-16 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Commande Reçue !</h1>
            <p className="text-gray-500 mt-2 mb-8">Votre commande est en préparation.</p>
            <Link href="/" className="w-full py-4 bg-black text-white rounded-xl font-bold block hover:bg-gray-800 transition">
                Retour au menu
            </Link>
        </div>
      </div>
    );
  }

  // Panier vide
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShoppingBag size={48} className="text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-8 text-gray-900">Votre panier est vide</h1>
        <Link href="/" className="bg-orange-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-orange-600 transition">
            Voir le menu
        </Link>
      </div>
    );
  }

  // Affichage du Panier
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      <div className="flex items-center mb-8">
        <Link href="/" className="mr-4 p-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={24} className="text-gray-700" />
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-900">Mon Panier</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Liste des articles */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.cartId} className="bg-white border border-gray-100 rounded-2xl p-5 flex justify-between items-start shadow-sm">
              <div className="flex-1">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                </div>

                {/* Affichage des Suppléments (Bleu) */}
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {item.selectedOptions.map((opt: any, idx: number) => (
                            <span key={idx} className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                + {opt.name}
                            </span>
                        ))}
                    </div>
                )}

                {/* Affichage des Ingrédients retirés (Rouge) */}
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
                    <p>Quantité: {item.quantity}</p>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <p className="text-orange-600 font-bold text-base">{(item.finalPrice * item.quantity).toFixed(2)} DH</p>
                </div>
              </div>

              <button 
                onClick={() => removeItem(item.cartId)} 
                className="p-2 -mr-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                title="Supprimer"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}

          {/* Formulaire */}
          <form id="orderForm" onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4 shadow-sm mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vos Coordonnées</h2>
            <div className="space-y-3">
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
                    placeholder="Numéro de téléphone" 
                    required 
                    className="w-full p-4 bg-gray-50 border-transparent focus:bg-white focus:border-black focus:ring-0 rounded-xl transition font-medium" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
                <textarea 
                    placeholder="Adresse de livraison précise (Code porte, étage...)" 
                    required 
                    rows={3}
                    className="w-full p-4 bg-gray-50 border-transparent focus:bg-white focus:border-black focus:ring-0 rounded-xl transition font-medium resize-none" 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                />
            </div>
          </form>
        </div>

        {/* Résumé Latéral */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 sticky top-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Résumé</h2>
            <div className="space-y-4 mb-8 text-gray-600 font-medium">
              <div className="flex justify-between"><span>Sous-total</span><span>{cartTotal.toFixed(2)} DH</span></div>
              <div className="flex justify-between"><span>Livraison</span><span>{deliveryFee.toFixed(2)} DH</span></div>
              <div className="border-t border-dashed border-gray-200 pt-4 flex justify-between items-center text-black">
                <span className="font-bold text-lg">Total</span>
                <span className="font-black text-2xl">{finalTotal.toFixed(2)} DH</span>
              </div>
            </div>
            <button 
                form="orderForm" 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-black hover:bg-gray-800 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center transition active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-gray-200"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Commander"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}