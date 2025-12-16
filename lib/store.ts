import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string // <--- CHANGEMENT ICI : string (UUID) au lieu de number
  name: string
  price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem: (item: { id: string; name: string; price: number }) => void // <--- ICI AUSSI
  removeItem: (id: string) => void // <--- ET ICI
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.id === product.id)
          
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            }
          }
          
          return {
            items: [...state.items, { ...product, quantity: 1 }],
          }
        })
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }))
      },

      clearCart: () => set({ items: [] }),

      total: () => {
        return get().items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      }
    }),
    {
      name: 'cart-storage',
    }
  )
)