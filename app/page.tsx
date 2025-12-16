'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/lib/store'
import { ShoppingBag, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { BRAND_ID } from '@/lib/constants'

// Définition propre des types
type Product = {
  id: string
  name: string
  price: number
  description: string
  image_url: string
  is_available: boolean
}

type Category = {
  id: string
  name: string
  products: Product[]
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const { addItem, items } = useCartStore()
  
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0)

  useEffect(() => {
    fetchMenu()
  }, [])

  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          products (
            id, name, price, description, image_url, is_available
          )
        `)
        .eq('brand_id', BRAND_ID)
        .eq('products.is_available', true)
        .order('rank')

      if (error) throw error

      // Nettoyage et TYPAGE FORT (Casting) pour rassurer TypeScript
      const rawData = data || []
      const cleanData = rawData
        .filter(cat => cat.products && Array.isArray(cat.products) && cat.products.length > 0)
        .map(cat => ({
            ...cat,
            // On force le type ici car Supabase retourne parfois des types profonds complexes
            products: cat.products as unknown as Product[] 
        }))

      setCategories(cleanData)

    } catch (error) {
      console.error("Erreur chargement menu:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      
      <header className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Universal Eats 🍔</h1>
          {cartCount > 0 && (
            <Link href="/cart" className="relative p-2 bg-black text-white rounded-full hover:scale-105 transition">
              <ShoppingBag size={20} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                {cartCount}
              </span>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-8">
        {categories.map((category) => (
          <section key={category.id}>
            <h2 className="text-xl font-extrabold text-gray-800 mb-4 px-1">{category.name}</h2>
            
            <div className="grid gap-4">
              {category.products.map((product) => (
                <div key={product.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 transition hover:shadow-md">
                  <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                        src={product.image_url || 'https://via.placeholder.com/150'} 
                        alt={product.name} 
                        className="w-full h-full object-cover" 
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight">{product.name}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <span className="font-bold text-lg text-gray-900">{product.price} <span className="text-xs font-normal text-gray-500">DH</span></span>
                        {/* TypeScript est content car addItem attend maintenant une string */}
                        <button 
                            onClick={() => addItem({ id: product.id, name: product.name, price: product.price })}
                            className="bg-black text-white p-2 rounded-lg active:scale-95 transition"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 max-w-md mx-auto z-20">
            <Link href="/cart" className="bg-black text-white w-full py-4 rounded-2xl shadow-xl flex items-center justify-between px-6 hover:bg-gray-900 transition active:scale-95">
                <div className="flex items-center gap-3">
                    <div className="bg-gray-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">{cartCount}</div>
                    <span className="font-bold">Voir le panier</span>
                </div>
                <ShoppingBag size={20} />
            </Link>
        </div>
      )}
    </div>
  )
}