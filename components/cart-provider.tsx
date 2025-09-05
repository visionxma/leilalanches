"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { toast } from "@/hooks/use-toast"

export interface CartItem {
  id: string
  name: string
  price: number
  promotionalPrice?: {
    quantity: number
    totalPrice: number
  }
  image: string
  quantity: number
  category: string
  subcategory?: string
  size?: string
  brand?: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: any) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  // Carregar carrinho do localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("cart")
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        if (Array.isArray(parsedCart)) {
          setItems(parsedCart)
        }
      }
    } catch (error) {
      console.error("Erro ao carregar carrinho:", error)
    }
  }, [])

  // Salvar carrinho no localStorage
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(items))
    } catch (error) {
      console.error("Erro ao salvar carrinho:", error)
    }
  }, [items])

  const addItem = useCallback((product: any) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === product.id)
      
      let newItems
      if (existingItem) {
        newItems = currentItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
        
        // Defer toast to avoid setState during render
        setTimeout(() => {
          toast({
            title: "Quantidade atualizada",
            description: `${product.name} - quantidade aumentada para ${existingItem.quantity + 1}`,
          })
        }, 0)
        
        return newItems
      } else {
        const newItem: CartItem = {
          id: product.id,
          name: product.name,
          price: product.price || 0,
          promotionalPrice: product.promotionalPrice,
          image: product.images?.[0] || "/placeholder.svg",
          quantity: 1,
          category: product.category || "Sem categoria",
          subcategory: product.subcategory,
          size: product.size,
          brand: product.brand,
        }
        
        newItems = [...currentItems, newItem]
        
        // Defer toast to avoid setState during render
        setTimeout(() => {
          toast({
            title: "Produto adicionado",
            description: `${product.name} foi adicionado ao carrinho`,
          })
        }, 0)
        
        return newItems
      }
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems(currentItems => {
      const item = currentItems.find(item => item.id === productId)
      const newItems = currentItems.filter(item => item.id !== productId)
      
      // Defer toast to avoid setState during render
      if (item) {
        setTimeout(() => {
          toast({
            title: "Produto removido",
            description: `${item.name} foi removido do carrinho`,
          })
        }, 0)
      }
      
      return newItems
    })
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }

    setItems(currentItems =>
      currentItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    )
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
    
    // Defer toast to avoid setState during render
    setTimeout(() => {
      toast({
        title: "Carrinho limpo",
        description: "Todos os itens foram removidos do carrinho",
      })
    }, 0)
  }, [])

  const getTotalItems = useCallback(() => {
    return items.reduce((total, item) => total + (item.quantity || 0), 0)
  }, [items])

  const getTotalPrice = useCallback(() => {
    return items.reduce((total, item) => {
      // Validação para evitar erros com valores undefined
      const itemPrice = item.price || 0
      const itemQuantity = item.quantity || 0
      
      if (item.promotionalPrice && 
          item.promotionalPrice.quantity && 
          item.promotionalPrice.totalPrice && 
          itemQuantity >= item.promotionalPrice.quantity) {
        const promoSets = Math.floor(itemQuantity / item.promotionalPrice.quantity)
        const remainingItems = itemQuantity % item.promotionalPrice.quantity
        const promoTotal = promoSets * (item.promotionalPrice.totalPrice || 0)
        const regularTotal = remainingItems * itemPrice
        return total + promoTotal + regularTotal
      }
      return total + (itemPrice * itemQuantity)
    }, 0)
  }, [items])

  const contextValue: CartContextType = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    isOpen,
    setIsOpen,
  }

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}