'use client';

import { useState, useMemo } from 'react';
import { Card, Tabs, Typography, Image, Flex, Tag } from 'antd';
import { 
    PictureOutlined, 
    LineChartOutlined, 
    DollarOutlined, 
    InboxOutlined, 
    TeamOutlined, 
    TruckOutlined 
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import ReportFilters, { type ReportFilterValue } from '@/components/reports/ReportFilters';
import ReportTable, { type ReportColumn, type ReportSummaryItem } from '@/components/reports/ReportTable';
import PageHeader from '@/components/common/PageHeader';

const { Text } = Typography;

type ReportKey = 'sales' | 'profit' | 'stock' | 'customer-debt' | 'supplier-debt';

interface ReportResponse {
    data: Array<Record<string, any>>;
    summary: Record<string, number | string>;
    comparison: { label: string; summary: Record<string, number | string> } | null;
}

const defaultFilters: ReportFilterValue = {
    period: 'this_month',
    compare: null,
    from: null,
    to: null,
};

// --- Helper: Build Query String ---
function buildQueryString(filters: ReportFilterValue) {
    const params = new URLSearchParams();
    params.set('period', filters.period);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.compare) params.set('compare', filters.compare || '');
    return params.toString();
}

// --- Configuration: Columns Definition ---
function getColumns(reportKey: ReportKey): ReportColumn[] {
    switch (reportKey) {
        case 'sales':
            return [
                { title: 'التاريخ', dataIndex: 'date', key: 'date' },
                { title: 'إجمالي المبيعات', dataIndex: 'totalSales', key: 'totalSales', money: true },
                { title: 'عدد الفواتير', dataIndex: 'invoiceCount', key: 'invoiceCount' },
                { title: 'المحصل', dataIndex: 'paidAmount', key: 'paidAmount', money: true },
                { title: 'الآجل المتبقي', dataIndex: 'remainingBalance', key: 'remainingBalance', money: true },
            ];
        case 'profit':
            return [
                { title: 'التاريخ', dataIndex: 'date', key: 'date' },
                { title: 'المبيعات', dataIndex: 'totalSales', key: 'totalSales', money: true },
                { title: 'التكلفة', dataIndex: 'cogs', key: 'cogs', money: true },
                { title: 'صافي الربح', dataIndex: 'netProfit', key: 'netProfit', money: true },
            ];
        case 'stock':
            return [
                {
                    title: 'المنتج',
                    key: 'nameAr',
                    render: (_, record) => (
                        <Flex align="center" gap={12}>
                            {record.imageUrl ? (
                                <Image
                                    src={record.imageUrl}
                                    alt={record.nameAr}
                                    width={40}
                                    height={40}
                                    style={{ objectFit: 'cover', borderRadius: 8 }}
                                    preview={false}
                                />
                            ) : (
                                <div style={{ width: 40, height: 40, background: '#f5f5f5', borderRadius: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <PictureOutlined style={{ color: '#bfbfbf' }} />
                                </div>
                            )}
                            <Flex vertical>
                                <Text strong style={{ fontSize: 13 }}>{record.nameAr}</Text>
                                {record.nameEn && <Text type="secondary" style={{ fontSize: 11 }}>{record.nameEn}</Text>}
                            </Flex>
                        </Flex>
                    ),
                },
                { title: 'المخزن', dataIndex: 'warehouseQty', key: 'warehouseQty' },
                { title: 'الرف', dataIndex: 'floorQty', key: 'floorQty' },
                { title: 'الإجمالي', dataIndex: 'totalQty', key: 'totalQty' },
                { title: 'قيمة المخزون', dataIndex: 'stockValue', key: 'stockValue', money: true },
                { 
                    title: 'أقرب انتهاء', 
                    dataIndex: 'earliestExpiry', 
                    key: 'earliestExpiry',
                    render: (val) => val ? <Tag color="orange" variant="filled">{val}</Tag> : '-'
                },
            ];
        case 'customer-debt':
        case 'supplier-debt':
            return [
                { title: reportKey === 'customer-debt' ? 'الاسم' : 'المورد', dataIndex: 'name', key: 'name' },
                { title: 'الهاتف', dataIndex: 'phone', key: 'phone' },
                { title: 'إجمالي الرصيد', dataIndex: 'totalOwed', key: 'totalOwed', money: true },
            ];
        default:
            return [];
    }
}

// --- Configuration: Summary Logic ---
function getSummaryItems(reportKey: ReportKey, summary: Record<string, any>): ReportSummaryItem[] {
    const s = summary || {};
    switch (reportKey) {
        case 'sales':
            return [
                { label: 'إجمالي المبيعات', value: s.totalSales || 0, money: true, color: '#1677ff' },
                { label: 'عدد الفواتير', value: s.invoiceCount || 0 },
                { label: 'المحصل', value: s.paidAmount || 0, money: true, color: '#52c41a' },
                { label: 'المتبقي', value: s.remainingBalance || 0, money: true, color: '#ff4d4f' },
            ];
        case 'profit':
            return [
                { label: 'إجمالي المبيعات', value: s.totalSales || 0, money: true },
                { label: 'صافي الربح', value: s.netProfit || 0, money: true, color: '#52c41a' },
                { label: 'هامش الربح', value: `${s.marginPercent || 0}%`, color: '#13c2c2' },
            ];
        case 'stock':
            return [
                { label: 'عدد المنتجات', value: s.totalProducts || 0 },
                { label: 'قيمة المخزون', value: s.stockValue || 0, money: true, color: '#722ed1' },
            ];
        default:
            return [{ label: 'العدد الإجمالي', value: s.entityCount || 0 }, { label: 'إجمالي المديونية', value: s.totalOwed || 0, money: true }];
    }
}

export default function ReportsPage() {
    const [activeReport, setActiveReport] = useState<ReportKey>('sales');
    const [filters, setFilters] = useState<ReportFilterValue>(defaultFilters);

    // Fetching data
    const { data, isLoading } = useQuery({
        queryKey: ['report', activeReport, filters],
        queryFn: async () => {
            const response = await fetch(`/api/reports/${activeReport}?${buildQueryString(filters)}`);
            if (!response.ok) throw new Error('تعذر تحميل التقرير');
            return (await response.json()) as ReportResponse;
        },
    });

    const reportTitles: Record<ReportKey, string> = {
        sales: 'تقرير المبيعات',
        profit: 'تقرير الربحية',
        stock: 'تقرير المخزون',
        'customer-debt': 'مديونية العملاء',
        'supplier-debt': 'مستحقات الموردين',
    };

    return (
        <Flex vertical gap={24}>
            <PageHeader title="التقارير والإحصائيات" />

            {/* Filters Section */}
            <ReportFilters value={filters} onChange={setFilters} />

            {/* Report Type Selector */}
            <Card 
                variant="borderless" 
                styles={{ body: { padding: '0 12px' } }} 
                style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
                <Tabs
                    activeKey={activeReport}
                    onChange={(k) => setActiveReport(k as ReportKey)}
                    tabBarGutter={24}
                    items={[
                        { key: 'sales', label: 'المبيعات', icon: <LineChartOutlined /> },
                        { key: 'profit', label: 'الربحية', icon: <DollarOutlined /> },
                        { key: 'stock', label: 'المخزون', icon: <InboxOutlined /> },
                        { key: 'customer-debt', label: 'العملاء', icon: <TeamOutlined /> },
                        { key: 'supplier-debt', label: 'الموردين', icon: <TruckOutlined /> },
                    ]}
                />
            </Card>

            {/* Report Table & Data Visualization */}
            <ReportTable
                title={reportTitles[activeReport]}
                columns={getColumns(activeReport)}
                data={data?.data ?? []}
                rowKey={activeReport === 'stock' ? 'productId' : (activeReport.includes('debt') ? 'entityId' : 'date')}
                loading={isLoading}
                exportType={activeReport}
                filters={filters}
                summaryItems={getSummaryItems(activeReport, data?.summary || {})}
                comparisonItems={
                    data?.comparison
                        ? getSummaryItems(activeReport, data.comparison.summary).map((item) => ({
                            ...item,
                            label: `${data.comparison?.label}: ${item.label}`,
                        }))
                        : undefined
                }
            />
        </Flex>
    );
}