'use client';

import React, { useEffect, useState } from 'react';
import { Product } from '../../interface/product';
import error from 'next/dist/api/error';
import Link from 'next/link';

export default function MenuPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('http://localhost:3000/products')
        .then(res => {
            if(!res.ok) throw new Error('Mất kết nối');
            return res.json();
        })
        .then(data => {
            setProducts(data);
            setLoading(false);
        })
        .catch(err =>{
            setError(err.message);
            setLoading(false);
        })

    }, []);

    if(loading) return <div className="flex h-screen items-center justify-center">Đang tải thực đơn BrewLite...</div>;

    if(error) return <div className="p-4 text-center text-red-500 font-bold">Lỗi kết nối đến máy chủ! Vui lòng tải lại.</div>;

    if(products.length === 0) return <div className="p-4 text-center text-gray-500">Hiện tại cửa hàng đang hết món.</div>;

    return (
        <div className="p-4 mx-auto max-w-7xl">
            <h1 className="text-2xl font-bold text-center mb-4">Thực đơn BrewLite</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(product => (
                    <Link 
                        href={`/product/${product.idProduct}`} 
                        key={product.idProduct} 
                        className="border rounded-lg p-4 shadow-md block hover:bg-gray-50 transition-colors"
                    >
                        <h2 className="text-xl font-semibold">{product.tenProduct}</h2>
                        <p className="text-lg font-bold text-blue-600">{Number(product.giaProduct).toLocaleString('vi-VN')} đ</p>
                    </Link>
                ))}
            </div>
        </div>  
    )   
}