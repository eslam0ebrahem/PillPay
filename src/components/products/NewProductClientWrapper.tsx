'use client';

import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { useState } from 'react';
import ProductForm, { ProductFormValues } from '@/components/products/ProductForm';

export default function NewProductClientWrapper() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (values: ProductFormValues) => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'فشلت إضافة المنتج');
            }

            message.success('تمت إضافة المنتج بنجاح');
            router.push('/products');
            router.refresh();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return <ProductForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
}
