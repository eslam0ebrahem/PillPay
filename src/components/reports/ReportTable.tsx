'use client';

import React, { useState, useEffect } from 'react';
import { Button, Card, Col, Row, Space, Typography, App, Grid, Flex, Divider, Tag } from 'antd';
import { DownloadOutlined, BarChartOutlined, RetweetOutlined } from '@ant-design/icons';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import ResponsiveDataView from '../common/ResponsiveDataView';
import { DataCard } from '../common/DataCard';
import type { ReportFilterValue } from './ReportFilters';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

export interface ReportSummaryItem {
    label: string;
    value: number | string;
    money?: boolean;
    color?: string; // Optional color branding for specific metrics
}

export interface ReportColumn {
    title: React.ReactNode;
    dataIndex?: string | string[];
    key: string;
    money?: boolean;
    render?: (value: any, record: Record<string, any>, index: number) => React.ReactNode;
}

interface ReportTableProps {
    title: string;
    columns: ReportColumn[];
    data: Array<Record<string, any>>;
    rowKey: string | ((item: Record<string, any>) => string);
    loading: boolean;
    exportType: string;
    filters: ReportFilterValue;
    summaryItems: ReportSummaryItem[];
    comparisonItems?: ReportSummaryItem[];
}

function buildQueryString(filters: ReportFilterValue) {
    const params = new URLSearchParams();
    params.set('period', filters.period);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.compare) params.set('compare', filters.compare);
    return params.toString();
}

// Utility to safely extract nested dataIndex values (e.g., ['product', 'name'])
const extractValue = (record: Record<string, any>, dataIndex?: string | string[]) => {
    if (!dataIndex) return undefined;
    if (Array.isArray(dataIndex)) {
        return dataIndex.reduce((acc, key) => (acc ? acc[key] : undefined), record);
    }
    return record[dataIndex];
};

export default function ReportTable({
    title,
    columns,
    data,
    rowKey,
    loading,
    exportType,
    filters,
    summaryItems,
    comparisonItems,
}: ReportTableProps) {
    const { message } = App.useApp();
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => setMounted(true), []);

    const isMobile = mounted && (screens.xs || (screens.sm && !screens.md));

    // Bake the money formatting directly into the effective columns
    const effectiveColumns = columns.map((column) => ({
        ...column,
        render: column.render ?? (column.money
            ? (value: any) => <Text strong><MoneyDisplay amount={Number(value ?? 0)} /></Text>
            : undefined),
    }));

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await fetch(`/api/reports/export/${exportType}?${buildQueryString(filters)}`);
            if (!response.ok) throw new Error('تعذر تصدير الملف');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `${exportType}-report.xlsx`;
            anchor.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'تعذر تصدير الملف');
        } finally {
            setExporting(false);
        }
    };

    // --- The Auto-Card Generator for Mobile ---
    // Takes ANY generic report data and maps it to the DataCard layout
    const renderMobileCard = (record: Record<string, any>, index: number) => {
        if (!effectiveColumns.length) return <div />;

        const titleCol = effectiveColumns[0];
        const rawTitleVal = extractValue(record, titleCol.dataIndex);
        const titleVal = titleCol.render ? titleCol.render(rawTitleVal, record, index) : rawTitleVal;

        const properties = effectiveColumns.slice(1).map(col => {
            const rawVal = extractValue(record, col.dataIndex);
            const val = col.render ? col.render(rawVal, record, index) : rawVal;
            return {
                label: col.title as string,
                value: val,
            };
        });

        return <DataCard title={titleVal} properties={properties} />;
    };

    return (
        <Flex vertical gap={24} style={{ width: '100%' }}>
            
            {/* Header & Export Actions */}
            <Flex justify="space-between" align="flex-start" wrap="wrap" gap={16}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BarChartOutlined style={{ color: '#1677ff' }} /> {title}
                    </Title>
                    <Text type="secondary">نتائج التقرير بناءً على الفلاتر المحددة</Text>
                </div>
                <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    loading={exporting}
                    onClick={() => void handleExport()}
                    size={isMobile ? "middle" : "large"}
                    block={isMobile} // Full width export button on mobile
                >
                    تصدير إلى Excel
                </Button>
            </Flex>

            {/* Summary Metrics Grid */}
            {summaryItems.length > 0 && (
                <Card 
                    size="small" 
                    variant="borderless" 
                    style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0' }}
                >
                    <Row gutter={[16, 16]}>
                        {summaryItems.map((item, idx) => (
                            <Col xs={12} sm={12} lg={summaryItems.length % 3 === 0 ? 8 : 6} key={item.label}>
                                <div style={{ 
                                    padding: '12px 16px', 
                                    background: '#fff', 
                                    borderRadius: 8, 
                                    border: '1px solid #f0f0f0',
                                    height: '100%',
                                    borderInlineStart: item.color ? `4px solid ${item.color}` : '4px solid #1677ff'
                                }}>
                                    <Text type="secondary" style={{ fontSize: 13 }}>{item.label}</Text>
                                    <div style={{ marginTop: 4 }}>
                                        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                                            {item.money ? <MoneyDisplay amount={Number(item.value)} /> : item.value}
                                        </Title>
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            )}

            {/* Comparison Metrics Strip */}
            {comparisonItems && comparisonItems.length > 0 && (
                <Card 
                    size="small" 
                    variant="borderless" 
                    style={{ background: '#fffbe6', borderRadius: 12, border: '1px solid #ffe58f' }} // Warning/Attention styling
                >
                    <Flex align="center" gap={8} style={{ marginBottom: 12 }}>
                        <RetweetOutlined style={{ color: '#faad14' }} />
                        <Text strong>مقارنة بالفترة السابقة</Text>
                    </Flex>
                    <Flex wrap="wrap" gap={isMobile ? 12 : 32} justify={isMobile ? "space-between" : "flex-start"}>
                        {comparisonItems.map((item) => (
                            <div key={item.label} style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{item.label}</Text>
                                <div style={{ marginTop: 2 }}>
                                    {item.money ? (
                                        <Text strong><MoneyDisplay amount={Number(item.value)} /></Text>
                                    ) : (
                                        <Text strong>{item.value}</Text>
                                    )}
                                </div>
                            </div>
                        ))}
                    </Flex>
                </Card>
            )}

            {/* The Responsive Data Table/Cards */}
            <div style={{ background: '#fff', borderRadius: 12, padding: isMobile ? 0 : 16, border: isMobile ? 'none' : '1px solid #f0f0f0' }}>
                <ResponsiveDataView
                    data={data}
                    loading={loading}
                    tableColumns={effectiveColumns}
                    renderCard={renderMobileCard}
                    rowKey={rowKey as any}
                    pagination={{ pageSize: 20, size: 'small' }}
                    tableProps={{
                        size: 'middle',
                        scroll: { x: 'max-content' },
                    }}
                />
            </div>
        </Flex>
    );
}