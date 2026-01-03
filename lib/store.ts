import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// 1. Définition stricte des types
export type CartOptionItem = {
  id: string;
  name: string;
  price: number;
}

export type CartItem = {
  cartId: string;     // ID unique dans le panier
  id: string;         // ID du produit
  name: string;
  image_url: string | null;
  unitPrice: number;  // PRIX UNITAIRE FINAL (Base + Options)
  quantity: number;
  
  // Champs complexes
  selectedVariation?: { id: string; name: string; price: number } | null;
  // Record<GroupId, Array<OptionItems>>
  selectedOptions?: Record<string, CartOptionItem[]>; 
  removedIngredients?: string[];
  note?: string;
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (cartId: string) => void
  updateQuantity: (cartId: string, quantity: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      
      addItem: (newItem) => set((state) => {
        // Log pour vérifier ce qui arrive dans le store (Ouvrir Console F12)
        console.log("📥 Store adding item:", newItem);

        // On vérifie si un item IDENTIQUE existe déjà pour fusionner les quantités
        // Attention : la comparaison d'objets (options) nécessite JSON.stringify
        const existingItemIndex = state.items.findIndex(
            i => i.id === newItem.id && 
            JSON.stringify(i.selectedVariation) === JSON.stringify(newItem.selectedVariation) &&
            JSON.stringify(i.selectedOptions) === JSON.stringify(newItem.selectedOptions) &&
            JSON.stringify(i.removedIngredients) === JSON.stringify(newItem.removedIngredients)&&
            (i.note || '') === (newItem.note || '')
            
        );

        if (existingItemIndex > -1) {
            const updatedItems = [...state.items];
            updatedItems[existingItemIndex].quantity += newItem.quantity;
            return { items: updatedItems };
        }

        return { items: [...state.items, newItem] };
      }),

      removeItem: (cartId) => set((state) => ({
        items: state.items.filter((item) => item.cartId !== cartId),
      })),

      updateQuantity: (cartId, quantity) => set((state) => ({
        items: state.items.map((item) =>
          item.cartId === cartId ? { ...item, quantity } : item
        ),
      })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage', // Clé dans le LocalStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
)