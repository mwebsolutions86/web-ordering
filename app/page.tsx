'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/lib/store'
import { ShoppingBag, Plus, Loader2, Star, Clock, MapPin, Search, ChevronRight, Leaf, Layers } from 'lucide-react'
import Link from 'next/link'
import { BRAND_ID, STORE_ID } from '@/lib/constants'
import ProductModal from '@/components/ProductModal'

// --- TYPES ---
type Product = {
  id: string
  name: string
  price: number
  description: string | null
  image_url: string | null
  ingredients: string[] | null
  options_config: any 
  is_available: boolean
}

type Category = {
  id: string
  name: string
  products: Product[]
}

type StoreInfo = {
  name: string
  logo_url: string | null
  primary_color: string // ex: "#E63946"
  secondary_color: string // ex: "#1D3557"
  description: string | null
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [store, setStore] = useState<StoreInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  
  // États Modale
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { items } = useCartStore()
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0)
  const cartTotal = items.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0)

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Valeurs par défaut si la DB est vide (Fallback)
  const PRIMARY = store?.primary_color || "#000000"; 
  const SECONDARY = store?.secondary_color || "#FFFFFF";

  useEffect(() => {
    fetchData()
    
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const cat of categories) {
        const element = categoryRefs.current[cat.id];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveCategory(cat.id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  const fetchData = async () => {
    try {
      // 1. Récupérer les infos du Magasin (Branding)
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('name, logo_url, primary_color, secondary_color, description')
        .eq('id', STORE_ID)
        .single();

      if (storeError) console.error("Erreur Store:", storeError);
      if (storeData) setStore(storeData);

      // 2. Récupérer le Menu (Catégories + Produits + Options)
      const { data, error } = await supabase
        .from('categories')
        .select(`
          id, name,
          products (
            id, name, price, description, image_url, is_available,
            product_ingredients ( ingredient: ingredients ( name ) ),
            product_option_links (
                group: option_groups (
                    id, name, min_selection, max_selection,
                    items: option_items ( id, name, price, is_available )
                )
            )
          )
        `)
        .eq('brand_id', BRAND_ID)
        .eq('products.is_available', true)
        .order('rank')

      if (error) throw error

      const cleanData = (data || [])
        .filter(cat => cat.products && Array.isArray(cat.products) && cat.products.length > 0)
        .map((cat: any) => ({
            ...cat,
            products: cat.products.map((prod: any) => {
                const flatIngredients = prod.product_ingredients?.map((pi: any) => pi.ingredient?.name).filter(Boolean) || [];
                const formattedOptions = prod.product_option_links?.map((link: any) => {
                    const group = link.group;
                    if (!group) return null;
                    return {
                        id: group.id,
                        name: group.name,
                        type: group.max_selection > 1 ? 'multiple' : 'single', 
                        items: (group.items || []).filter((i: any) => i.is_available).sort((a: any, b: any) => a.price - b.price)
                    };
                }).filter(Boolean) || [];

                return {
                    ...prod,
                    ingredients: flatIngredients,
                    options_config: formattedOptions
                };
            })
        }))

      setCategories(cleanData)
      if(cleanData.length > 0) setActiveCategory(cleanData[0].id)

    } catch (error) {
      console.error("Erreur générale:", error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 180;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
        <p className="text-gray-500 font-medium animate-pulse">Chargement...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-32">
      
      {/* --- HERO SECTION DYNAMIQUE --- */}
      <div className="relative h-[300px] md:h-[400px] w-full bg-gray-900 overflow-hidden">
        {/* Image de fond (Peut aussi venir du store si vous ajoutez un champ cover_url) */}
        <img 
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop" 
          alt="Cover" 
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
               {/* Badge Ouvert avec couleur dynamique */}
               <span 
                 style={{ backgroundColor: PRIMARY, color: SECONDARY }}
                 className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider"
               >
                 Ouvert maintenant
               </span>
               
               <div className="flex items-center gap-4">
                   {store?.logo_url && (
                       <img src={store.logo_url} alt="Logo" className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 border-white/20 shadow-lg object-cover bg-white"/>
                   )}
                   <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
                       {store?.name || "Universal Eats"}
                       <span style={{ color: PRIMARY }}>.</span>
                   </h1>
               </div>

               <p className="text-gray-300 max-w-xl text-sm md:text-base line-clamp-2">
                   {store?.description || "Découvrez nos délicieux plats préparés avec passion."}
               </p>

               <div className="flex flex-wrap items-center gap-4 text-gray-200 text-sm md:text-base font-medium">
                  <span className="flex items-center gap-1"><Star size={16} className="text-yellow-400 fill-yellow-400"/> 4.8</span>
                  <span className="flex items-center gap-1"><Clock size={16}/> 20-30 min</span>
                  <span className="flex items-center gap-1"><MapPin size={16}/> Agadir</span>
               </div>
            </div>
            
            {/* Recherche Desktop */}
            <div className="hidden md:block w-full max-w-md">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition" size={20}/>
                    <input 
                        type="text" 
                        placeholder="Rechercher un plat..." 
                        className="w-full h-14 pl-12 pr-4 bg-white/10 backdrop-blur-md text-white placeholder-gray-300 rounded-2xl border border-white/20 focus:bg-white focus:text-black focus:border-white transition shadow-lg outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- STICKY NAV --- */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-4">
                {categories.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => scrollToCategory(cat.id)}
                            style={{ 
                                backgroundColor: isActive ? PRIMARY : '#F3F4F6',
                                color: isActive ? SECONDARY : '#4B5563'
                            }}
                            className="px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 hover:scale-105 shadow-sm"
                        >
                            {cat.name}
                        </button>
                    )
                })}
            </div>
        </div>
      </div>

      {/* --- MENU CONTENT --- */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 mt-4">
        {categories.map((category) => {
            const filteredProducts = category.products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
            if(filteredProducts.length === 0) return null;

            return (
              <section 
                key={category.id} 
                id={category.id} 
                ref={(el) => { categoryRefs.current[category.id] = el; }}
                className="scroll-mt-48"
              >
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
                  {category.name}
                  <span className="h-1 flex-1 bg-gray-100 rounded-full"></span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => (
                    <div 
                        key={product.id} 
                        className="group bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
                        onClick={() => openProductModal(product)}
                    >
                      {/* Image */}
                      <div className="h-56 overflow-hidden relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={product.image_url || 'https://via.placeholder.com/400x300?text=No+Image'} 
                            alt={product.name} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-lg shadow-sm font-bold text-sm">
                            {product.price} DH
                        </div>
                      </div>
                      
                      {/* Contenu */}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 leading-tight transition-colors" style={{color: 'inherit'}}>
                                {product.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                                {product.description || "Délicieux plat préparé avec soin."}
                            </p>
                        </div>
                        
                        <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                            <div className="flex gap-2">
                                {product.ingredients && product.ingredients.length > 0 && (
                                    <span className="bg-green-50 text-green-600 p-1.5 rounded-full"><Leaf size={14}/></span>
                                )}
                                {product.options_config && product.options_config.length > 0 && (
                                    <span className="bg-blue-50 text-blue-600 p-1.5 rounded-full"><Layers size={14}/></span>
                                )}
                            </div>
                            
                            {/* Bouton Plus avec Couleur Dynamique au survol (via CSS inline pour le fond par défaut) */}
                            <div 
                                style={{ backgroundColor: PRIMARY, color: SECONDARY }}
                                className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transform transition-transform group-hover:rotate-90"
                            >
                                <Plus size={20} />
                            </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
        })}
      </main>

      {/* --- FLOATING CART --- */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <Link 
                href="/cart" 
                style={{ backgroundColor: PRIMARY, color: SECONDARY }}
                className="flex items-center gap-4 pl-5 pr-2 py-2 rounded-full shadow-2xl hover:brightness-110 transition active:scale-95 group"
            >
                <div className="flex flex-col">
                    <span className="text-xs font-medium opacity-80 uppercase tracking-wider">Mon Panier</span>
                    <span className="font-bold text-lg leading-none">{cartCount} articles</span>
                </div>
                
                <div className="bg-white/20 h-12 px-5 rounded-full flex items-center gap-2">
                    <span className="font-black">{cartTotal.toFixed(2)} DH</span>
                    <ChevronRight size={18} />
                </div>
            </Link>
        </div>
      )}

      {/* LA MODALE PRODUIT */}
      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={selectedProduct} 
      />
      
    </div>
  )
}