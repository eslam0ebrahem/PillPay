'use client';

import { Table, Tag } from 'antd';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import dayjs from 'dayjs';

interface BatchViewerProps {
    batches: any[];
    loading?: boolean;
    expiringSoonDays: number;
}

export default function BatchViewer({ batches, loading, expiringSoonDays }: BatchViewerProps) {
    const columns = [
        {
            title: ar.batches.batchNumber,
            dataIndex: 'batchNumber',
            key: 'batchNumber',
        },
        {
            title: ar.batches.expirationDate,
            dataIndex: 'expirationDate',
            key: 'expirationDate',
            render: (date: string) => {
                const now = dayjs();
                const exp = dayjs(date);
                const diffDays = exp.diff(now, 'day');

                let color = 'default';
                let tagText = '';

                if (diffDays < 0) {
                    color = 'error';
                    tagText = ar.batches.expired;
                } else if (diffDays <= expiringSoonDays) {
                    color = 'warning';
                    tagText = ar.batches.expiringSoon;
                }

                return (
                    <span>
                        {exp.format('YYYY-MM-DD')}{' '}
                        {tagText && (
                            <Tag color={color} style={{ marginRight: 8 }}>
                                {tagText}
                            </Tag>
                        )}
                    </span>
                );
            },
        },
        {
            title: ar.batches.floorQty,
            dataIndex: 'floorQty',
            key: 'floorQty',
        },
        {
            title: ar.batches.warehouseQty,
            dataIndex: 'warehouseQty',
            key: 'warehouseQty',
        },
        {
            title: ar.batches.purchasePrice,
            dataIndex: 'purchasePrice',
            key: 'purchasePrice',
            render: (val: number) => formatPiasters(val),
        },
        {
            title: ar.batchSource.source,
            dataIndex: 'source',
            key: 'source',
            render: (source: string) => {
                const colorMap: Record<string, string> = {
                    supplier_invoice: 'blue',
                    initial_stock: 'green',
                    adjustment: 'orange',
                };
                const label = ar.batchSource[source as keyof typeof ar.batchSource] || source || ar.batchSource.supplier_invoice;
                return <Tag color={colorMap[source] || 'default'}>{label}</Tag>;
            },
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={batches}
            rowKey="_id"
            loading={loading}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
        />
    );
}
