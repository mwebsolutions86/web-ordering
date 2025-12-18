"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/store';
import { ShoppingBag, Trash2, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STORE_ID } from '@/lib/constants';

export default function CartPage() {
  const { items, removeItem, clearCart, total } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

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
      const rpcItems = items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        options: []
      }));

      const { error: rpcError } = await supabase.rpc('create_order_secure', {
        p_store_id: STORE_ID,
        p_items: rpcItems,
        p_delivery_address: formData.address,
        p_location: null
      });

      if (rpcError) throw rpcError;

      clearCart();
      setOrderComplete(true);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      alert("Erreur: " + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gray-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full flex flex-col items-center">
            <CheckCircle className="text-green-600 w-16 h-16 mb-4" />
            <h1 className="text-2xl font-bold">Commande Reçue !</h1>
            <p className="text-gray-500 mt-2 mb-8">Votre commande est en préparation.</p>
            <Link href="/" className="w-full py-4 bg-black text-white rounded-xl font-bold">Retour au menu</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShoppingBag size={48} className="text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold mb-8">Votre panier est vide</h1>
        <Link href="/" className="bg-orange-500 text-white px-8 py-3 rounded-full font-semibold">Voir le menu</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Link href="/" className="mr-4 p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></Link>
        <h1 className="text-3xl font-bold">Mon Panier</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-orange-500 font-bold">{item.price.toFixed(2)} DH</p>
                <p className="text-sm text-gray-400">Quantité: {item.quantity}</p>
              </div>
              <button onClick={() => removeItem(item.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={20} /></button>
            </div>
          ))}

          <form id="orderForm" onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-bold">Coordonnées</h2>
            <input type="text" placeholder="Nom" required className="w-full p-3 bg-gray-50 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input type="tel" placeholder="Téléphone" required className="w-full p-3 bg-gray-50 rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            <textarea placeholder="Adresse de livraison" required className="w-full p-3 bg-gray-50 rounded-lg" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border rounded-xl p-6 sticky top-8">
            <h2 className="text-xl font-bold mb-4">Résumé</h2>
            <div className="space-y-3 mb-6 text-gray-600">
              <div className="flex justify-between"><span>Sous-total</span><span>{cartTotal.toFixed(2)} DH</span></div>
              <div className="flex justify-between"><span>Livraison</span><span>{deliveryFee.toFixed(2)} DH</span></div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg text-black"><span>Total</span><span>{finalTotal.toFixed(2)} DH</span></div>
            </div>
            <button form="orderForm" type="submit" disabled={isSubmitting} className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold flex items-center justify-center">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirmer la commande"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}