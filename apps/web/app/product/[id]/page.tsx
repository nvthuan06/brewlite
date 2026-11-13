'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Product } from '../../../interface/product';

type ProductDetail = Product & {
  sizes?: { code: string; label: string; extraPrice: number }[];
  toppings?: { code: string; label: string; extraPrice: number }[];
};

function ProductDetailContent() {
  const params = useParams();
  const id = params?.id;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('S');
  const [selectedTopping, setSelectedTopping] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/backend/products/${id}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        if (!res.ok) {
          throw new Error('Không thể tải chi tiết sản phẩm');
        }
        return res.json();
      })
      .then((data: ProductDetail | null) => {
        if (data) {
          setProduct(data);
          if (data.sizes && data.sizes.length > 0) {
            setSelectedSize(data.sizes[0].code);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Đang tải chi tiết sản phẩm...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 font-bold mb-4">Sản phẩm không tồn tại!</p>
        <Link href="/menu" className="text-blue-500 underline">
          Quay lại Menu
        </Link>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 font-bold mb-4">
          Lỗi kết nối đến máy chủ! Vui lòng tải lại.
        </p>
        <Link href="/menu" className="text-blue-500 underline">
          Quay lại Menu
        </Link>
      </div>
    );
  }

  const conHang = product.trangThaiBan && product.soLuong > 0;

  return (
    <div className="p-4 mx-auto max-w-2xl">
      <Link href="/menu" className="inline-block text-sm text-blue-500 mb-4">
        &larr; Quay lại Menu
      </Link>

      <div className="border border-gray-700 rounded-lg p-6 shadow-md">
        <img
          src={product.urlAnh}
          alt={product.tenProduct}
          className="w-full h-64 object-cover rounded-md mb-4 bg-gray-800"
        />

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{product.tenProduct}</h1>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded ${
              conHang
                ? 'bg-green-900 text-green-300'
                : 'bg-red-900 text-red-300'
            }`}
          >
            {conHang ? `Còn hàng (${product.soLuong})` : 'Hết hàng'}
          </span>
        </div>

        <p className="text-xl font-bold mb-6">
          {Number(product.giaProduct).toLocaleString('vi-VN')} đ
        </p>

        {/* Chọn Size */}
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Chọn Size</h2>
          <div className="flex flex-wrap gap-2">
            {product.sizes?.map((size) => (
              <button
                key={size.code}
                type="button"
                onClick={() => setSelectedSize(size.code)}
                className={`px-4 py-2 border rounded-md text-sm font-medium transition cursor-pointer ${
                  selectedSize === size.code
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-gray-600 hover:border-gray-400'
                }`}
              >
                {size.label}
                {size.extraPrice > 0 &&
                  ` (+${size.extraPrice.toLocaleString('vi-VN')} đ)`}
              </button>
            ))}
          </div>
        </div>

        {/* Chọn Topping */}
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Chọn Topping (tùy chọn)</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTopping('')}
              className={`px-4 py-2 border rounded-md text-sm font-medium transition cursor-pointer ${
                selectedTopping === ''
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
            >
              Không topping
            </button>

            {product.toppings?.map((topping) => (
              <button
                key={topping.code}
                type="button"
                onClick={() => setSelectedTopping(topping.code)}
                className={`px-4 py-2 border rounded-md text-sm font-medium transition cursor-pointer ${
                  selectedTopping === topping.code
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-gray-600 hover:border-gray-400'
                }`}
              >
                {topping.label}
                {topping.extraPrice > 0 &&
                  ` (+${topping.extraPrice.toLocaleString('vi-VN')} đ)`}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4 text-sm text-gray-300">
          Đã chọn:{' '}
          <span className="font-semibold text-white">Size {selectedSize}</span>
          {selectedTopping && (
            <>
              {' '}
              &bull;{' '}
              <span className="font-semibold text-white">
                {
                  product.toppings?.find((t) => t.code === selectedTopping)
                    ?.label
                }
              </span>
            </>
          )}
        </div>
        <div>
            <button>Thêm vào vỏ hàng</button>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          Đang tải chi tiết sản phẩm...
        </div>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}