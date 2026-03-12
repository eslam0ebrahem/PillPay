export const dynamic = 'force-dynamic';

import React from 'react';
import PageHeader from '@/components/common/PageHeader';
import AuditSession from '@/components/stock/AuditSession';
import { Alert, Space } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

export default function StockAuditPage() {
    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 1. Header with Breadcrumbs/Actions */}
            <PageHeader 
                title="جرد المخزون" 
                subtitle="قم بمطابقة الكميات الفعلية على الرف مع سجلات النظام"
            />

            {/* 2. Mobile User Tip */}
            <Alert
                title="نصيحة للجرد الميداني"
                description="إذا كنت تستخدم جهازاً محمولاً، يرجى التأكد من شحن البطارية وعدم إغلاق الصفحة أثناء عملية الجرد لضمان حفظ البيانات."
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ borderRadius: 12 }}
                closable
            />

            {/* 3. The Main Audit Engine */}
            <div style={{ 
                background: '#fff', 
                borderRadius: 16, 
                padding: '4px', // Slight padding for mobile card aesthetics
                minHeight: '60vh'
            }}>
                <AuditSession />
            </div>
        </Space>
    );
}