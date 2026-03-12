'use client';

import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Space, Grid, Typography, Divider, Flex } from 'antd';
import { CalendarOutlined, InboxOutlined, ShopOutlined, DollarOutlined } from '@ant-design/icons';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;
const { Text } = Typography;

// 1. Defined a strict interface to replace 'any'
export interface Batch {
    _id: string;
    batchNumber: string;
    expirationDate: string;
    floorQty: number;
    warehouseQty: number;
    purchasePrice: number;
    source: string;
}

interface BatchViewerProps {
    batches: Batch[];
    loading?: boolean;
    expiringSoonDays: number;
}

export default function BatchViewer({ batches, loading, expiringSoonDays }: BatchViewerProps) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration errors in Next.js when using useBreakpoint
    useEffect(() => {
        setMounted(true);
    }, []);

    // 2. Extracted Expiration Logic for reuse in both Mobile and Desktop views
    const getExpirationTag = (date: string) => {
        const now = dayjs();
        const exp = dayjs(date);
        const diffDays = exp.diff(now, 'day');

        if (diffDays < 0) {
            return <Tag color="error">{ar.batches.expired}</Tag>;
        } 
        if (diffDays <= expiringSoonDays) {
            return <Tag color="warning">{ar.batches.expiringSoon}</Tag>;
        }
        return null;
    };

    // 3. Extracted Source Logic and fixed fallback coloring
    const getSourceTag = (source: string) => {
        const sourceKey = source || 'supplier_invoice';
        const label = ar.batchSource[sourceKey as keyof typeof ar.batchSource] || sourceKey;
        
        const colorMap: Record<string, string> = {
            supplier_invoice: 'blue',
            initial_stock: 'green',
            adjustment: 'orange',
        };

        return <Tag color={colorMap[sourceKey] || 'default'}>{label}</Tag>;
    };

    const columns = [
        {
            title: ar.batches.batchNumber,
            dataIndex: 'batchNumber',
            key: 'batchNumber',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: ar.batches.expirationDate,
            dataIndex: 'expirationDate',
            key: 'expirationDate',
            render: (date: string) => (
                <span>
                    {dayjs(date).format('YYYY-MM-DD')}
                    {/* Fixed margin for RTL/Arabic layouts */}
                    <span style={{ marginInlineStart: 8 }}>
                        {getExpirationTag(date)}
                    </span>
                </span>
            ),
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
            render: (source: string) => getSourceTag(source),
        },
    ];

    // Show a loading state or nothing until the client has mounted to check breakpoints
    if (!mounted) {
        return <Table loading={true} dataSource={[]} columns={columns} pagination={false} />;
    }

    // 4. Mobile View: Render a clean list of cards if the screen is smaller than 'md' (768px)
    const isMobile = screens.xs || (screens.sm && !screens.md);

    if (isMobile) {
        return (
            <Flex vertical gap={12}>
                {batches.map((batch) => (
                    <Card 
                        key={batch._id}
                        size="small" 
                        style={{ width: '100%', borderRadius: 8 }}
                        title={
                            <Space>
                                <Text strong>#{batch.batchNumber}</Text>
                                {getExpirationTag(batch.expirationDate)}
                            </Space>
                        }
                        extra={getSourceTag(batch.source)}
                    >
                        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                            <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                                <Text type="secondary"><CalendarOutlined /> {ar.batches.expirationDate}</Text>
                                <Text>{dayjs(batch.expirationDate).format('YYYY-MM-DD')}</Text>
                            </Flex>
                            
                            <Divider style={{ margin: '8px 0' }} />
                            
                            <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                                <Text type="secondary"><ShopOutlined /> {ar.batches.floorQty}</Text>
                                <Text strong>{batch.floorQty}</Text>
                            </Flex>
                            
                            <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                                <Text type="secondary"><InboxOutlined /> {ar.batches.warehouseQty}</Text>
                                <Text strong>{batch.warehouseQty}</Text>
                            </Flex>

                            <Divider style={{ margin: '8px 0' }} />

                            <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                                <Text type="secondary"><DollarOutlined /> {ar.batches.purchasePrice}</Text>
                                <Text strong>{formatPiasters(batch.purchasePrice)}</Text>
                            </Flex>
                        </Space>
                    </Card>
                ))}
            </Flex>
        );
    }

    // 5. Desktop View: Keep the table
    return (
        <Table
            columns={columns}
            dataSource={batches}
            rowKey="_id"
            loading={loading}
            pagination={false}
            size="small"
        />
    );
}