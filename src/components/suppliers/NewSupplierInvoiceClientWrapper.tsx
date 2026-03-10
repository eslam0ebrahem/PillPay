'use client';

import { useRouter } from 'next/navigation';
import { App } from 'antd';
import { useState } from 'react';
import InvoiceForm from '@/components/suppliers/InvoiceForm';

interface Props {
    suppliers: any[];
    products: any[];
}

export default function NewSupplierInvoiceClientWrapper({ suppliers, products }: Props) {
    const { message } = App.useApp();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (values: any) => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/supplier-invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'فشل حفظ الفاتورة');
            }

            message.success('تم حفظ الفاتورة بنجاح وتحديث أرصدة المخزن');
            router.push('/supplier-invoices');
            router.refresh();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return <InvoiceForm suppliers={suppliers} products={products} onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
}
