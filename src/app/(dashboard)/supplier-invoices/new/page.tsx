export const dynamic = 'force-dynamic';

import React from 'react';
import PageHeader from '@/components/common/PageHeader';
import { connectDB } from '@/lib/db/connection';
import Supplier from '@/lib/models/Supplier';
import Product from '@/lib/models/Product';
import NewSupplierInvoiceClientWrapper from '@/components/suppliers/NewSupplierInvoiceClientWrapper';
import { Flex } from 'antd';

export default async function NewSupplierInvoicePage() {
    await connectDB();

    /**
     * PERFORMANCE FIX: Promise.all kills the "Waterfall"
     * Instead of waiting for suppliers to finish before starting products, 
     * we fire both queries to MongoDB simultaneously.
     */
    const [suppliers, products] = await Promise.all([
        Supplier.find({ isActive: true })
            .select('name')
            .sort({ name: 1 })
            .lean(),
        Product.find({ isActive: true })
            .select('nameAr nameEn barcode barcode2 lowStockThreshold')
            .sort({ nameAr: 1 })
            .lean()
    ]);

    /**
     * Serialization Helper
     * Ensures ObjectIds and Dates are transformed into plain strings
     * for the Client Component's consumption.
     */
    const serialize = (data: any) => JSON.parse(JSON.stringify(data));

    return (
        <Flex vertical gap={24} style={{ paddingBottom: 40 }}>
            {/* 1. Contextual Header */}
            <PageHeader 
                title="تسجيل فاتورة مورد جديدة" 
                subtitle="أضف المنتجات الواردة لتحديث مستويات المخزون وتكلفة الشراء"
            />

            {/* 2. Form Wrapper */}
            <div style={{ width: '100%' }}>
                <NewSupplierInvoiceClientWrapper 
                    suppliers={serialize(suppliers)} 
                    products={serialize(products)} 
                />
            </div>
        </Flex>
    );
}