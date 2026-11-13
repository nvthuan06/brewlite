"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, ProductSizeOption, ProductToppingOption } from "../interface/product";
import { CartItem } from "@/interface/cart";

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (
    product: Product,
    size: ProductSizeOption,
    topping: ProductToppingOption | null,
    soLuong: number,
  ) => void;
  updateQuantity: (cartItemId: string, soLuongMoi: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  getUnitPrice: (item: CartItem) => number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "brewlite_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch (error) {
      console.error("Lỗi đọc giỏ hàng:", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error("Lỗi lưu giỏ hàng:", error);
    }
  }, [cartItems]);

  const getUnitPrice = (item: CartItem): number => {
    const giaGoc = Number(item.giaProduct) || 0;
    const giaSize = Number(item.size?.extraPrice) || 0;
    const giaTopping = Number(item.topping?.extraPrice) || 0;
    return giaGoc + giaSize + giaTopping;
  };

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + getUnitPrice(item) * item.soLuong,
    0,
  );

  const addToCart = (
    product: Product,
    size: ProductSizeOption,
    topping: ProductToppingOption | null,
    soLuong: number,
  ) => {
    const cartItemId = `${product.idProduct}-${size.code}-${topping?.code ?? "none"}`;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          soLuong: updated[existingIndex].soLuong + soLuong,
        };
        return updated;
      }

      return [
        ...prev,
        {
          cartItemId,
          idProduct: product.idProduct,
          tenProduct: product.tenProduct,
          giaProduct: Number(product.giaProduct),
          urlAnh: product.urlAnh,
          soLuong,
          size,
          topping,
        },
      ];
    });
  };

  const updateQuantity = (cartItemId: string, soLuongMoi: number) => {
    if (soLuongMoi < 1) return;
    setCartItems((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId ? { ...item, soLuong: soLuongMoi } : item,
      ),
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCartItems([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getUnitPrice,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart phải được dùng bên trong <CartProvider>");
  }
  return context;
}
