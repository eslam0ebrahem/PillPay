'use client';

import React from 'react';
import { Card, Button, Flex, Typography, Statistic, Row, Col } from 'antd';
import { PlusOutlined, TruckOutlined, ShopOutlined } from '@ant-design/icons';
import Link from 'next/link';
import SupplierList from '@/components/suppliers/SupplierList';
import PageHeader from '@/components/common/PageHeader';
import ar from '@/i18n/ar';

const { Text } = Typography;

interface SuppliersPageClientProps {
    data: any[];
}

export default function SuppliersPageClient({ data }: SuppliersPageClientProps) {
    return (
        <Flex vertical gap={24}>
            {/* 1. Dynamic Page Header */}
            <PageHeader
                title={ar.nav.suppliers}
                subtitle="إدارة بيانات الموردين، عناوين الاتصال، وسجلات التوريد"
                extra={
                    <Link href="/suppliers/new">
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />} 
                            size="large"
                            block
                            style={{ borderRadius: 8 }}
                        >
                            {ar.suppliers.addSupplier}
                        </Button>
                    </Link>
                }
            />

            {/* 2. Quick Stats (Optional but helpful for context) */}
            <Row gutter={[16, 16]}>
                <Col xs={12} sm={8}>
                    <Card variant="borderless"style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <Statistic 
                            title="إجمالي الموردين" 
                            value={data.length} 
                            prefix={<TruckOutlined style={{ color: '#1677ff' }} />} 
                        />
                    </Card>
                </Col>
            </Row>

            {/* 3. The Main List Container */}
            <Card 
               variant="borderless"
                style={{ 
                    borderRadius: 12, 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    overflow: 'hidden' 
                }}
                styles={{ body: { padding: 0 } }} // Remove padding to let ResponsiveDataView handle edges
            >
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                    <Text strong>قائمة الموردين المسجلين</Text>
                </div>
                
                <SupplierList
                    data={data}
                    loading={false}
                    onSearch={() => { }}
                />
            </Card>
        </Flex>
    );
}