// web-ordering/lib/store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string 
  // --- NOUVEAUX CHAMPS POUR ALIGNEMENT ---
  cartId: string // ID unique pour différencier (Burger Sans Oignon vs Burger Normal)
  name: string
  price: number
  finalPrice: number // Prix avec options incluses
  quantity: number
  selectedOptions: any[] 
  removedIngredients: string[]
}

interface CartState {
  items: CartItem[]
  addItem: (item: any) => void
  removeItem: (cartId: string) => void
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (payload) => {
        set((state) => {
          // Génération d'un ID unique comme sur mobile
          const optionsStr = JSON.stringify((payload.selectedOptions || []).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')));
          const ingredientsStr = JSON.stringify((payload.removedIngredients || []).sort());
          const cartId = `${payload.id}-${optionsStr}-${ingredientsStr}`;

          const existingItemIndex = state.items.findIndex((item) => item.cartId === cartId);
          
          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += payload.quantity;
            return { items: newItems };
          }
          
          return {
            items: [...state.items, {
              cartId,
              id: payload.id,
              name: payload.name,
              price: payload.price,
              finalPrice: payload.finalPrice || payload.price, // Fallback si pas d'options
              quantity: payload.quantity,
              selectedOptions: payload.selectedOptions || [],
              removedIngredients: payload.removedIngredients || []
            }],
          }
        })
      },

      removeItem: (cartId) => {
        set((state) => ({
          items: state.items.filter((item) => item.cartId !== cartId),
        }))
      },

      clearCart: () => set({ items: [] }),

      total: () => {
        return get().items.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0)
      }
    }),
    {
      name: 'cart-storage',
    }
  )
)