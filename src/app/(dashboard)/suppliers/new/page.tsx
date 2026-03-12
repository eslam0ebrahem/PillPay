export const dynamic = 'force-dynamic';

import React from 'react';
import PageHeader from '@/components/common/PageHeader';
import NewSupplierClientWrapper from '@/components/suppliers/NewSupplierClientWrapper';
import { Flex } from 'antd';
import ar from '@/i18n/ar';

export default function NewSupplierPage() {
    return (
        <Flex vertical gap={24} style={{ paddingBottom: 40 }}>
            {/* 1. Standardized Header */}
            <PageHeader 
                title={ar.suppliers.addSupplier} 
                subtitle="قم بإدخال بيانات المورد الجديد بدقة لإدارة عمليات الشراء والمديونيات بشكل صحيح"
            />

            {/* 2. Focused Entry Area */}
            <div style={{ 
                maxWidth: 900, // Matches the New Product page for visual rhythm
                width: '100%', 
                margin: '0 auto' 
            }}>
                <NewSupplierClientWrapper />
            </div>
        </Flex>
    );
}