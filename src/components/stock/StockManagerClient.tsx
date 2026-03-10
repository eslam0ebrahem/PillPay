'use client';

import React, { useState } from 'react';
import { Table, Button, Modal, Tabs, Space, Tag, App } from 'antd';
import { SyncOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StockOverviewClient from '@/components/products/StockOverviewClient';
import TransferForm from './TransferForm';
import InitialStockForm from './InitialStockForm';
import ar from '@/i18n/ar';
import dayjs from 'dayjs';

interface StockManagerClientProps {
    safeBatches: any[];
    products: any[];
}

export default function StockManagerClient({ safeBatches, products }: StockManagerClientProps) {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isInitialStockModalOpen, setIsInitialStockModalOpen] = useState(false);

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
            queryClient.invalidateQueries({ queryKey: ['stockTransfers'] });
            // Fully refresh to get latest batch quantities
            window.location.reload();
        },
        onError: (error: any) => {
            message.error(error.message);
        },
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
            window.location.reload();
        },
        onError: (error: any) => {
            message.error(error.message);
        },
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
        },
        {
            title: 'الدفعة',
            dataIndex: ['batchId', 'batchNumber'],
        },
        {
            title: 'الكمية',
            dataIndex: 'quantity',
            render: (qty: number) => <strong>{qty}</strong>,
        },
        {
            title: 'الاتجاه',
            dataIndex: 'direction',
            render: (dir: string) => {
                const isToFloor = dir === 'to_floor';
                return (
                    <Tag color={isToFloor ? 'blue' : 'orange'}>
                        {isToFloor ? 'إلى الصيدلية' : 'إلى المخزن'}
                    </Tag>
                );
            },
        },
        {
            title: 'السبب',
            dataIndex: 'reason',
        },
        {
            title: 'المستخدم',
            dataIndex: ['transferredBy', 'name'],
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
            </div>

            <Tabs
                defaultActiveKey="1"
                items={[
                    {
                        key: '1',
                        label: 'أرصدة الدفعات',
                        children: <StockOverviewClient batches={safeBatches} />,
                    },
                    {
                        key: '2',
                        label: (
                            <span>
                                <HistoryOutlined /> سجل التحويلات
                            </span>
                        ),
                        children: (
                            <Table
                                columns={transferColumns}
                                dataSource={transfers}
                                rowKey="_id"
                                loading={loadingTransfers}
                                pagination={{ pageSize: 20 }}
                            />
                        ),
                    },
                ]}
            />

            <Modal
                title="تحويل رصيد"
                open={isTransferModalOpen}
                onCancel={() => !transferMutation.isPending && setIsTransferModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                {isTransferModalOpen && (
                    <TransferForm
                        products={products}
                        onSubmit={async (values) => await transferMutation.mutateAsync(values)}
                        isLoading={transferMutation.isPending}
                    />
                )}
            </Modal>

            <Modal
                title={ar.initialStock.title}
                open={isInitialStockModalOpen}
                onCancel={() => !initialStockMutation.isPending && setIsInitialStockModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                {isInitialStockModalOpen && (
                    <InitialStockForm
                        products={products}
                        onSubmit={async (values) => await initialStockMutation.mutateAsync(values)}
                        isLoading={initialStockMutation.isPending}
                    />
                )}
            </Modal>
        </div>
    );
}
