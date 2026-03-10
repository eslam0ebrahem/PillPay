'use client';

import { useState } from 'react';
import { Card, Tabs, Typography, Image } from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import ReportFilters, {
    type ReportFilterValue,
} from '@/components/reports/ReportFilters';
import ReportTable, {
    type ReportColumn,
    type ReportSummaryItem,
} from '@/components/reports/ReportTable';
import PageHeader from '@/components/common/PageHeader';

const { Title } = Typography;

type ReportKey = 'sales' | 'profit' | 'stock' | 'customer-debt' | 'supplier-debt';

interface ReportResponse {
    data: Array<Record<string, unknown>>;
    summary: Record<string, number | string>;
    comparison: { label: string; summary: Record<string, number | string> } | null;
}

const defaultFilters: ReportFilterValue = {
    period: 'this_month',
    compare: null,
    from: null,
    to: null,
};

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

function getColumns(reportKey: ReportKey): ReportColumn[] {
    switch (reportKey) {
        case 'sales':
            return [
                { title: 'التاريخ', dataIndex: 'date', key: 'date' },
                { title: 'إجمالي المبيعات', dataIndex: 'totalSales', key: 'totalSales', money: true },
                { title: 'عدد الفواتير', dataIndex: 'invoiceCount', key: 'invoiceCount' },
                { title: 'المحصل', dataIndex: 'paidAmount', key: 'paidAmount', money: true },
                {
                    title: 'الآجل المتبقي',
                    dataIndex: 'remainingBalance',
                    key: 'remainingBalance',
                    money: true,
                },
            ];
        case 'profit':
            return [
                { title: 'التاريخ', dataIndex: 'date', key: 'date' },
                { title: 'المبيعات', dataIndex: 'totalSales', key: 'totalSales', money: true },
                { title: 'التكلفة', dataIndex: 'cogs', key: 'cogs', money: true },
                { title: 'صافي الربح', dataIndex: 'netProfit', key: 'netProfit', money: true },
                { title: 'عدد الفواتير', dataIndex: 'invoiceCount', key: 'invoiceCount' },
            ];
        case 'stock':
            return [
                {
                    title: 'المنتج',
                    key: 'nameAr',
                    render: (_: any, record: any) => (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div>
                                {record.imageUrl ? (
                                    <Image
                                        src={record.imageUrl}
                                        alt={record.nameAr}
                                        width={40}
                                        height={40}
                                        style={{ objectFit: 'cover', borderRadius: 4 }}
                                        fallback="https://via.placeholder.com/40?text=No+Image"
                                    />
                                ) : (
                                    <div style={{ width: 40, height: 40, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 4 }}>
                                        <PictureOutlined style={{ fontSize: 16, color: '#d9d9d9' }} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <div>{record.nameAr}</div>
                                {record.nameEn && (
                                    <div style={{ color: '#8c8c8c', fontSize: '12px' }}>{record.nameEn}</div>
                                )}
                            </div>
                        </div>
                    ),
                },
                { title: 'التصنيف', dataIndex: 'category', key: 'category' },
                { title: 'المخزن', dataIndex: 'warehouseQty', key: 'warehouseQty' },
                { title: 'الرف', dataIndex: 'floorQty', key: 'floorQty' },
                { title: 'الإجمالي', dataIndex: 'totalQty', key: 'totalQty' },
                { title: 'قيمة المخزون', dataIndex: 'stockValue', key: 'stockValue', money: true },
                { title: 'أقرب انتهاء', dataIndex: 'earliestExpiry', key: 'earliestExpiry' },
            ];
        case 'customer-debt':
        case 'supplier-debt':
            return [
                { title: reportKey === 'customer-debt' ? 'الاسم' : 'المورد', dataIndex: 'name', key: 'name' },
                { title: 'الهاتف', dataIndex: 'phone', key: 'phone' },
                { title: 'إجمالي الرصيد', dataIndex: 'totalOwed', key: 'totalOwed', money: true },
                { title: 'تاريخ الإنشاء', dataIndex: 'createdAt', key: 'createdAt' },
            ];
        default:
            return [];
    }
}

function getSummaryItems(reportKey: ReportKey, summary: Record<string, number | string>): ReportSummaryItem[] {
    switch (reportKey) {
        case 'sales':
            return [
                { label: 'إجمالي المبيعات', value: Number(summary.totalSales ?? 0), money: true },
                { label: 'عدد الفواتير', value: Number(summary.invoiceCount ?? 0) },
                {
                    label: 'متوسط الفاتورة',
                    value: Number(summary.averageInvoiceValue ?? 0),
                    money: true,
                },
                { label: 'المحصل', value: Number(summary.paidAmount ?? 0), money: true },
                {
                    label: 'المتبقي',
                    value: Number(summary.remainingBalance ?? 0),
                    money: true,
                },
            ];
        case 'profit':
            return [
                { label: 'إجمالي المبيعات', value: Number(summary.totalSales ?? 0), money: true },
                { label: 'التكلفة', value: Number(summary.cogs ?? 0), money: true },
                { label: 'صافي الربح', value: Number(summary.netProfit ?? 0), money: true },
                { label: 'هامش الربح %', value: Number(summary.marginPercent ?? 0) },
            ];
        case 'stock':
            return [
                { label: 'عدد المنتجات', value: Number(summary.totalProducts ?? 0) },
                { label: 'كمية المخزن', value: Number(summary.totalWarehouseQty ?? 0) },
                { label: 'كمية الرف', value: Number(summary.totalFloorQty ?? 0) },
                { label: 'قيمة المخزون', value: Number(summary.stockValue ?? 0), money: true },
            ];
        case 'customer-debt':
            return [
                { label: 'عدد العملاء', value: Number(summary.entityCount ?? 0) },
                { label: 'إجمالي المديونية', value: Number(summary.totalOwed ?? 0), money: true },
            ];
        case 'supplier-debt':
            return [
                { label: 'عدد الموردين', value: Number(summary.entityCount ?? 0) },
                { label: 'إجمالي المستحقات', value: Number(summary.totalOwed ?? 0), money: true },
            ];
        default:
            return [];
    }
}

function getRowKey(reportKey: ReportKey) {
    switch (reportKey) {
        case 'stock':
            return 'productId';
        case 'customer-debt':
        case 'supplier-debt':
            return 'entityId';
        default:
            return 'date';
    }
}

export default function ReportsPage() {
    const [activeReport, setActiveReport] = useState<ReportKey>('sales');
    const [filters, setFilters] = useState<ReportFilterValue>(defaultFilters);

    const { data, isLoading } = useQuery({
        queryKey: [
            'report',
            activeReport,
            filters.period,
            filters.compare,
            filters.from,
            filters.to,
        ],
        queryFn: async () => {
            const response = await fetch(
                `/api/reports/${activeReport}?${buildQueryString(filters)}`
            );

            if (!response.ok) {
                throw new Error('تعذر تحميل التقرير');
            }

            return (await response.json()) as ReportResponse;
        },
    });

    return (
        <div>
            <PageHeader title="التقارير" />

            <Card style={{ marginBottom: 16 }}>
                <ReportFilters value={filters} onChange={setFilters} />
            </Card>

            <Tabs
                activeKey={activeReport}
                onChange={(nextKey) => setActiveReport(nextKey as ReportKey)}
                items={[
                    { key: 'sales', label: 'المبيعات' },
                    { key: 'profit', label: 'الربحية' },
                    { key: 'stock', label: 'المخزون' },
                    { key: 'customer-debt', label: 'مديونية العملاء' },
                    { key: 'supplier-debt', label: 'مستحقات الموردين' },
                ]}
            />

            <ReportTable
                title={
                    {
                        sales: 'تقرير المبيعات',
                        profit: 'تقرير الربحية',
                        stock: 'تقرير المخزون',
                        'customer-debt': 'تقرير مديونية العملاء',
                        'supplier-debt': 'تقرير مستحقات الموردين',
                    }[activeReport]
                }
                columns={getColumns(activeReport)}
                data={data?.data ?? []}
                rowKey={getRowKey(activeReport)}
                loading={isLoading}
                exportType={activeReport}
                filters={filters}
                summaryItems={getSummaryItems(activeReport, data?.summary ?? {})}
                comparisonItems={
                    data?.comparison
                        ? getSummaryItems(activeReport, data.comparison.summary).map((item) => ({
                            ...item,
                            label: `${data.comparison?.label}: ${item.label}`,
                        }))
                        : undefined
                }
            />
        </div>
    );
}
