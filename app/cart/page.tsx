'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Trash2, ArrowLeft, CheckCircle, MapPin, User, Loader2, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { STORE_ID } from '@/lib/constants' // <--- Import Important

export default function CartPage() {
  // ... (Hooks habituels)
  const { items, removeItem, clearCart, total } = useCartStore()
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' })

  useEffect(() => setMounted(true), [])

  const DELIVERY_FEE = 15
  const cartTotal = total()
  const finalTotal = cartTotal + DELIVERY_FEE

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return

    setIsSubmitting(true)

    try {
      // 🏗️ 1. CRÉATION DE LA COMMANDE (HEADER)
      // On utilise les nouveaux champs stricts de la DB
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          store_id: STORE_ID,          // Liaison au magasin physique
          status: 'NEW',               // Enum Strict
          payment_status: 'PENDING',
          payment_method: 'CASH',
          
          total_amount: finalTotal,
          delivery_fee: DELIVERY_FEE,
          delivery_address: formData.address,
          
          guest_info: { name: formData.name, phone: formData.phone } // JSONB
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 🏗️ 2. CRÉATION DES LIGNES (ITEMS)
      // On sauvegarde le prix au moment de l'achat (Snapshot)
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.quantity
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Succès !
      clearCart()
      setOrderComplete(true)

    } catch (error) {
      console.error("Erreur commande:", error)
      alert("Erreur technique lors de la commande.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ... (Reste du JSX d'affichage inchangé, c'est juste de l'UI)
  if (orderComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gray-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="text-green-600 w-10 h-10" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Commande Reçue !</h1>
            <p className="text-gray-500 mt-2 mb-8">La cuisine du <b>Casablanca HQ</b> a reçu votre ticket. Ça va chauffer ! 🔥</p>
            
            <Link href="/" className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition">
                Commander à nouveau
            </Link>
        </div>
      </div>
    )
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 h-16 flex items-center gap-4 sticky top-0 z-10 border-b border-gray-100">
        <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft className="text-gray-900" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Finaliser la commande</h1>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Liste Panier */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {items.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-gray-50 w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm text-gray-900 border border-gray-200">
                            {item.quantity}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-500">{item.price} DH</p>
                        </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-gray-300 hover:text-red-500 transition">
                        <Trash2 size={18} />
                    </button>
                </div>
            ))}
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <User size={18} className="text-blue-600"/> Coordonnées
                </h2>
                <input 
                    type="text" placeholder="Votre Nom" required
                    className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <input 
                    type="tel" placeholder="Téléphone mobile" required
                    className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <MapPin size={18} className="text-red-500"/> Livraison
                </h2>
                <textarea 
                    placeholder="Adresse exacte (Quartier, rue, étage...)" required
                    className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition min-h-[100px]"
                    value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex justify-between text-gray-500 mb-2"><span>Sous-total</span><span>{cartTotal} DH</span></div>
                <div className="flex justify-between text-gray-500 mb-4"><span>Livraison</span><span>{DELIVERY_FEE} DH</span></div>
                <div className="border-t border-dashed border-gray-200 pt-4 flex justify-between items-center">
                    <span className="font-bold text-xl text-gray-900">Total</span>
                    <span className="font-bold text-xl text-blue-600">{finalTotal} DH</span>
                </div>
            </div>

            <button 
                type="submit" disabled={isSubmitting}
                className="w-full bg-black text-white font-bold py-4 rounded-2xl shadow-lg shadow-gray-400/50 hover:bg-gray-800 transition active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
            >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <>Commander (Paiement Cash) <CreditCard size={18}/></>}
            </button>
        </form>
      </main>
    </div>
  )
}