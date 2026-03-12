'use client';

import React from 'react';
import PageHeader from '@/components/common/PageHeader';
import NewProductClientWrapper from '@/components/products/NewProductClientWrapper';
import { Card, Typography, Flex } from 'antd';
import { MedicineBoxOutlined } from '@ant-design/icons';
import ar from '@/i18n/ar';

export default function NewProductPage() {
    return (
        <Flex vertical gap={24} style={{ paddingBottom: 40 }}>
            {/* 1. Specialized Header */}
            <PageHeader 
                title={ar.products.addProduct} 
                subtitle="أدخل بيانات المنتج الجديد بدقة لضمان صحة الجرد والتقارير"
            />

            {/* 2. Form Container with Max-Width for Readability */}
            <div style={{ 
                maxWidth: 900, 
                width: '100%', 
                margin: '0 auto',
            }}>
                <Card 
                    variant="borderless" 
                    style={{ 
                        borderRadius: 16, 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)' 
                    }}
                >
                    {/* Header inside the card for mobile context */}
                    <Flex align="center" gap={12} style={{ marginBottom: 32 }}>
                        <div style={{ 
                            background: '#e6f4ff', 
                            padding: '12px', 
                            borderRadius: '12px',
                            color: '#1677ff',
                            display: 'flex'
                        }}>
                            <MedicineBoxOutlined style={{ fontSize: 24 }} />
                        </div>
                        <div>
                            <Typography.Text strong style={{ fontSize: 16, display: 'block' }}>
                                بيانات الصنف الأساسية
                            </Typography.Text>
                            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                                يرجى تعبئة الحقول المطلوبة (التي تحمل علامة *) 
                            </Typography.Text>
                        </div>
                    </Flex>

                    <NewProductClientWrapper />
                </Card>
            </div>
        </Flex>
    );
}