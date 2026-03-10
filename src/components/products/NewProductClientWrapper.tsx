'use client';

import { useRouter } from 'next/navigation';
import { App } from 'antd';
import { useState } from 'react';
import ProductForm, { ProductFormValues } from '@/components/products/ProductForm';

export default function NewProductClientWrapper() {
    const { message } = App.useApp();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);

    const handleSubmit = async (values: ProductFormValues) => {
        setIsSubmitting(true);
        try {
            const { initialStock, addInitialStock, ...productValues } = values;
            const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
            const method = editingProductId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productValues),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'فشلت العملية');
            }

            const product = await res.json();
            const productId = editingProductId || product._id;

            // Handle initial stock if provided (works for both new and found products in this wrapper)
            if (addInitialStock && initialStock) {
                const stockRes = await fetch('/api/stock/initial-entry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...initialStock,
                        productId,
                    }),
                });

                if (!stockRes.ok) {
                    const stockData = await stockRes.json();
                    message.warning(`تم إنشاء المنتج ولكن فشل تسجيل المخزون: ${stockData.error?.message || 'خطأ غير معروف'}`);
                } else {
                    message.success('تم إنشاء المنتج وتسجيل المخزون الأولي بنجاح');
                }
            } else {
                message.success(editingProductId ? 'تم تحديث المنتج بنجاح' : 'تمت إضافة المنتج بنجاح');
            }

            router.push('/products');
            router.refresh();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ProductForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            onProductFound={(product) => setEditingProductId(product._id)}
            mode={editingProductId ? 'edit' : 'create'}
        />
    );
}
