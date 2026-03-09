'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button, Card, Col, Row, Space, Table, Typography, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import type { ReportFilterValue } from './ReportFilters';

const { Text, Title } = Typography;

export interface ReportSummaryItem {
    label: string;
    value: number | string;
    money?: boolean;
}

export interface ReportColumn {
    title: string;
    dataIndex?: string;
    key: string;
    money?: boolean;
    render?: (value: unknown, record: Record<string, unknown>) => ReactNode;
}

interface ReportTableProps {
    title: string;
    columns: ReportColumn[];
    data: Array<Record<string, unknown>>;
    rowKey: string;
    loading: boolean;
    exportType: string;
    filters: ReportFilterValue;
    summaryItems: ReportSummaryItem[];
    comparisonItems?: ReportSummaryItem[];
}

function buildQueryString(filters: ReportFilterValue) {
    const params = new URLSearchParams();
    params.set('period', filters.period);

    if (filters.from) {
        params.set('from', filters.from);
    }

    if (filters.to) {
        params.set('to', filters.to);
    }

    if (filters.compare) {
        params.set('compare', filters.compare);
    }

    return params.toString();
}

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
    const [exporting, setExporting] = useState(false);

    const effectiveColumns = columns.map((column) => ({
        ...column,
        render:
            column.render ??
            (column.money
                ? (value: unknown) => <MoneyDisplay amount={Number(value ?? 0)} />
                : undefined),
    }));

    const handleExport = async () => {
        setExporting(true);

        try {
            const response = await fetch(
                `/api/reports/export/${exportType}?${buildQueryString(filters)}`
            );

            if (!response.ok) {
                throw new Error('تعذر تصدير الملف');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `${exportType}-report.xlsx`;
            anchor.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            const messageText =
                error instanceof Error ? error.message : 'تعذر تصدير الملف';
            message.error(messageText);
        } finally {
            setExporting(false);
        }
    };

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Card>
                <Row gutter={[16, 16]} align="middle" justify="space-between">
                    <Col>
                        <Title level={4} style={{ margin: 0 }}>
                            {title}
                        </Title>
                    </Col>
                    <Col>
                        <Button
                            icon={<DownloadOutlined />}
                            loading={exporting}
                            onClick={() => void handleExport()}
                        >
                            تصدير إلى Excel
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Row gutter={[16, 16]}>
                {summaryItems.map((item) => (
                    <Col xs={24} sm={12} lg={8} key={item.label}>
                        <Card variant="borderless">
                            <Text type="secondary">{item.label}</Text>
                            <div style={{ marginTop: 8 }}>
                                {item.money ? (
                                    <Title level={5} style={{ margin: 0 }}>
                                        <MoneyDisplay amount={Number(item.value)} />
                                    </Title>
                                ) : (
                                    <Title level={5} style={{ margin: 0 }}>
                                        {item.value}
                                    </Title>
                                )}
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {comparisonItems && comparisonItems.length > 0 ? (
                <Card variant="borderless">
                    <Space wrap size="large">
                        {comparisonItems.map((item) => (
                            <div key={item.label}>
                                <Text type="secondary">{item.label}</Text>
                                <div>
                                    {item.money ? (
                                        <MoneyDisplay amount={Number(item.value)} />
                                    ) : (
                                        <Text strong>{item.value}</Text>
                                    )}
                                </div>
                            </div>
                        ))}
                    </Space>
                </Card>
            ) : null}

            <Card variant="borderless">
                <Table
                    loading={loading}
                    columns={effectiveColumns}
                    dataSource={data}
                    rowKey={rowKey}
                    scroll={{ x: 'max-content' }}
                    pagination={{ pageSize: 20 }}
                />
            </Card>
        </Space>
    );
}
