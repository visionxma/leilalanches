"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CartSidebar } from "@/components/cart-sidebar"
import { ProductCard } from "@/components/product-card"
import { ProductModal } from "@/components/product-modal"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Banner } from "@/components/banner"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface Product {
  id: string
  name: string
  description: string
  price: number
  promotionalPrice?: {
    quantity: number
    totalPrice: number
  }
  images: string[]
  category: string
  subcategory?: string
  size?: string
  brand?: string
  stock?: number
  featured?: boolean
  sold?: boolean
}

export default function HomePage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Memoized filtered products to avoid recalculation on every render
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products

    const searchLower = searchTerm.toLowerCase().trim()
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower) ||
        (product.size && product.size.toLowerCase().includes(searchLower)) ||
        (product.brand && product.brand.toLowerCase().includes(searchLower))
      )
    })
  }, [products, searchTerm])

  // Memoized grouped products
  const groupedProducts = useMemo(() => {
    return filteredProducts.reduce(
      (acc, product) => {
        const category = product.category
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(product)
        return acc
      },
      {} as Record<string, Product[]>,
    )
  }, [filteredProducts])

  const categories = useMemo(() => Object.keys(groupedProducts).sort(), [groupedProducts])

  // Callback to handle product selection
  const handleProductSelect = useCallback((product: Product) => {
    setSelectedProduct(product)
    setIsProductModalOpen(true)
  }, [])

  // Callback to clear search
  const clearSearch = useCallback(() => {
    setSearchTerm("")
  }, [])

  // Callback to handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name"))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const productsData: Product[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          // Filter out sold products client-side to avoid composite index requirement
          if (!data.sold) {
            productsData.push({ id: doc.id, ...data } as Product)
          }
        })

        setProducts(productsData)
        setIsLoadingProducts(false)
      },
      (error) => {
        console.error("Error fetching products:", error)
        setIsLoadingProducts(false)
      }
    )

    const handleOpenProductModal = (event: CustomEvent) => {
      const { product } = event.detail
      setSelectedProduct(product)
      setIsProductModalOpen(true)
    }

    window.addEventListener("openProductModal", handleOpenProductModal as EventListener)

    return () => {
      unsubscribe()
      window.removeEventListener("openProductModal", handleOpenProductModal as EventListener)
    }
  }, [])

  // Loading component
  const LoadingSpinner = () => (
    <div className="text-center py-6">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
      <p className="text-xs text-muted-foreground">Carregando produtos...</p>
    </div>
  )

  // Empty state component
  const EmptyState = ({ icon, title, description, action }: {
    icon: React.ReactNode
    title: string
    description: string
    action?: React.ReactNode
  }) => (
    <div className="text-center py-8">
      <div className="bg-card border rounded-lg p-4 max-w-md mx-auto">
        <div className="mb-3">
          <div className="w-12 h-12 mx-auto mb-2 bg-muted rounded-full flex items-center justify-center">
            {icon}
          </div>
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
        {action}
      </div>
    </div>
  )

  // Search bar component
  const SearchBar = () => (
    <div className="mb-4">
      <div className="relative max-w-md mx-auto">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Pesquisar produtos..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="block w-full pl-10 pr-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
        />
        {searchTerm && (
          <button 
            onClick={clearSearch} 
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="Limpar pesquisa"
          >
            <svg
              className="h-4 w-4 text-muted-foreground hover:text-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )

  // Products grid component
  const ProductsGrid = ({ products }: { products: Product[] }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isSelected={false}
          onSelect={() => handleProductSelect(product)}
          compact={true}
        />
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-2 py-4">
        {/* Hero Section */}
        <div className="text-center mb-4">
          <p className="text-muted-foreground text-sm">Encontre tudo o que você precisa, entrega rápida e segura</p>
        </div>

        {/* Banners Promocionais */}
        <Banner />

        {/* Search Bar */}
        {!isLoadingProducts && products.length > 0 && <SearchBar />}

        {/* Products Grid or States */}
        {isLoadingProducts ? (
          <LoadingSpinner />
        ) : products.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            }
            title="Loja sem produtos"
            description="Nossa loja está sendo preparada. Volte mais tarde!"
          />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
            title="Nenhum produto encontrado"
            description={
              <>
                Não encontramos produtos para "<span className="font-medium">{searchTerm}</span>".
              </>
            }
            action={
              <button
                onClick={clearSearch}
                className="bg-primary text-primary-foreground px-3 py-1 text-sm rounded-lg hover:bg-primary/90 transition-colors"
              >
                Ver todos
              </button>
            }
          />
        ) : (
          <div className="space-y-6 mb-4">
            {/* Mostrar produtos agrupados por categoria ou lista simples */}
            {searchTerm ? (
              // Se há pesquisa, mostrar lista simples com 5 produtos por linha
              <ProductsGrid products={filteredProducts} />
            ) : (
              // Se não há pesquisa, mostrar agrupado por categoria
              categories.map((category) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground capitalize">{category}</h2>
                    <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full text-xs">
                      {groupedProducts[category].length}
                    </span>
                  </div>
                  <ProductsGrid products={groupedProducts[category]} />
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* VisionX Footer */}
      <div className="bg-black text-white">
        <div className="container mx-auto px-2 py-2">
          <div className="text-center">
            <p className="text-xs">
              Criado por{" "}
              <a
                href="https://visionxma.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white hover:text-gray-300 transition-colors underline"
              >
                VisionX
              </a>
            </p>
          </div>
        </div>
      </div>

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={selectedProduct}
      />

      {/* Carrinho Sidebar Flutuante */}
      <div className="fixed bottom-4 right-4 z-50">
        <CartSidebar />
      </div>
    </div>
  )
}