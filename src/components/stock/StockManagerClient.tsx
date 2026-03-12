'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, Space, Tag, App, Grid, Typography, Button } from 'antd';
import { SyncOutlined, HistoryOutlined, PlusOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StockOverviewClient from '@/components/products/StockOverviewClient';
import TransferForm from './TransferForm';
import InitialStockForm from './InitialStockForm';
import MobileFormWrapper from '../common/MobileFormWrapper';
import PageHeader from '../common/PageHeader';
import ResponsiveDataView from '../common/ResponsiveDataView';
import { DataCard } from '../common/DataCard';
import ar from '@/i18n/ar';
import dayjs from 'dayjs';

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface StockManagerClientProps {
    safeBatches: any[];
    products: any[];
}

export default function StockManagerClient({ safeBatches, products }: StockManagerClientProps) {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isInitialStockModalOpen, setIsInitialStockModalOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const { data: transfers, isLoading: loadingTransfers } = useQuery({
        queryKey: ['stockTransfers'],
        queryFn: async () => {
            const res = await fetch('/api/stock/transfers');
            if (!res.ok) throw new Error('Failed to load transfers');
            const { data } = await res.json();
            return data;
        },
    });

    const transferMutation = useMutation({
        mutationFn: async (values: any) => {
            const res = await fetch('/api/stock/transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'فشل التحويل');
            }
            return res.json();
        },
        onSuccess: () => {
            message.success('تمت عملية التحويل بنجاح');
            setIsTransferModalOpen(false);
            // Invalidate everything related to stock so the UI updates without a reload
            queryClient.invalidateQueries({ queryKey: ['stockTransfers'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['batches'] });
        },
        onError: (error: any) => message.error(error.message),
    });

    const initialStockMutation = useMutation({
        mutationFn: async (values: any) => {
            const res = await fetch('/api/stock/initial-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || 'فشل تسجيل المخزون');
            }
            return res.json();
        },
        onSuccess: () => {
            message.success(ar.initialStock.success);
            setIsInitialStockModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['batches'] });
        },
        onError: (error: any) => message.error(error.message),
    });

    const transferColumns = [
        {
            title: 'التاريخ',
            dataIndex: 'createdAt',
            render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: 'المنتج',
            dataIndex: ['productId', 'nameAr'],
            render: (name: string) => <Text strong>{name}</Text>
        },
        {
            title: 'الكمية',
            dataIndex: 'quantity',
            render: (qty: number) => <Tag color="cyan" style={{ fontSize: '14px' }}>{qty}</Tag>,
        },
        {
            title: 'الاتجاه',
            dataIndex: 'direction',
            render: (dir: string) => (
                <Tag color={dir === 'to_floor' ? 'blue' : 'orange'}>
                    {dir === 'to_floor' ? 'إلى الصيدلية' : 'إلى المخزن'}
                </Tag>
            ),
        },
        {
            title: 'السبب',
            dataIndex: 'reason',
        },
    ];

    const renderTransferCard = (item: any) => (
        <DataCard
            title={item.productId?.nameAr || 'منتج غير معروف'}
            badge={
                <Tag color={item.direction === 'to_floor' ? 'blue' : 'orange'}>
                    {item.direction === 'to_floor' ? 'إلى الصيدلية' : 'إلى المخزن'}
                </Tag>
            }
            properties={[
                { label: 'التاريخ', value: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') },
                { label: 'الكمية المحولة', value: <Text strong>{item.quantity}</Text> },
                { label: 'رقم التشغيلة', value: item.batchId?.batchNumber },
                { label: 'بواسطة', value: item.transferredBy?.name },
                { label: 'السبب', value: item.reason, fullWidth: true }
            ]}
        />
    );

    if (!mounted) return null;

    return (
        <div>
            <PageHeader 
                title="إدارة المخزون" 
                extra={
                    <Space>
                        <Button
                            icon={<PlusOutlined />}
                            onClick={() => setIsInitialStockModalOpen(true)}
                        >
                            {ar.initialStock.addInitialStock}
                        </Button>
                        <Button
                            type="primary"
                            icon={<SyncOutlined />}
                            onClick={() => setIsTransferModalOpen(true)}
                        >
                            تحويل رصيد
                        </Button>
                    </Space>
                }
            />

            <Tabs
                defaultActiveKey="1"
                type="card"
                items={[
                    {
                        key: '1',
                        label: 'أرصدة الدفعات',
                        children: (
                            <div style={{ marginTop: 16 }}>
                                <StockOverviewClient batches={safeBatches} />
                            </div>
                        ),
                    },
                    {
                        key: '2',
                        label: (
                            <span>
                                <HistoryOutlined /> سجل التحويلات
                            </span>
                        ),
                        children: (
                            <div style={{ marginTop: 16 }}>
                                <ResponsiveDataView
                                    data={transfers || []}
                                    loading={loadingTransfers}
                                    tableColumns={transferColumns}
                                    renderCard={renderTransferCard}
                                    rowKey="_id"
                                />
                            </div>
                        ),
                    },
                ]}
            />

            {/* Forms remain wrapped for mobile/desktop flexibility */}
            <MobileFormWrapper
                title="تحويل رصيد بين المخازن"
                open={isTransferModalOpen}
                onClose={() => !transferMutation.isPending && setIsTransferModalOpen(false)}
            >
                {isTransferModalOpen && (
                    <TransferForm
                        products={products}
                        onSubmit={async (values) => await transferMutation.mutateAsync(values)}
                        isLoading={transferMutation.isPending}
                    />
                )}
            </MobileFormWrapper>

            <MobileFormWrapper
                title={ar.initialStock.title}
                open={isInitialStockModalOpen}
                onClose={() => !initialStockMutation.isPending && setIsInitialStockModalOpen(false)}
            >
                {isInitialStockModalOpen && (
                    <InitialStockForm
                        products={products}
                        onSubmit={async (values) => await initialStockMutation.mutateAsync(values)}
                        isLoading={initialStockMutation.isPending}
                    />
                )}
            </MobileFormWrapper>
        </div>
    );
}