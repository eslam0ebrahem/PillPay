export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';
import { Card, Col, Empty, List, Row, Space, Table, Tag, Typography } from 'antd';
import DashboardCards from '@/components/reports/DashboardCards';
import { getAlertsDetail } from '@/lib/services/alerts.service';
import { getDashboardSummary, type DashboardProductStat } from '@/lib/services/report.service';
import { formatEGP } from '@/utils/money';
import ar from '@/i18n/ar';

const { Text, Title } = Typography;

function ProductStatsTable({
    title,
    data,
}: {
    title: string;
    data: DashboardProductStat[];
}) {
    return (
        <Card title={title} bordered={false}>
            <Table
                size="small"
                rowKey="id"
                pagination={false}
                locale={{ emptyText: <Empty description={ar.actions.noData} /> }}
                columns={[
                    {
                        title: 'المنتج',
                        dataIndex: 'name',
                        key: 'name',
                    },
                    {
                        title: 'الكمية',
                        dataIndex: 'quantity',
                        key: 'quantity',
                        width: 140,
                    },
                ]}
                dataSource={data}
            />
        </Card>
    );
}

function AlertListCard({
    title,
    color,
    items,
    renderMeta,
}: {
    title: string;
    color: string;
    items: Array<{ _id: string; nameAr: string }>;
    renderMeta?: (item: any) => ReactNode;
}) {
    return (
        <Card title={title} bordered={false}>
            {items.length === 0 ? (
                <Empty description={ar.actions.noData} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <List
                    dataSource={items}
                    renderItem={(item) => (
                        <List.Item>
                            <Space direction="vertical" size={2}>
                                <Space>
                                    <Tag color={color}>{item.nameAr}</Tag>
                                </Space>
                                {renderMeta ? (
                                    <Text type="secondary">{renderMeta(item)}</Text>
                                ) : null}
                            </Space>
                        </List.Item>
                    )}
                />
            )}
        </Card>
    );
}

export default async function DashboardPage() {
    const [summary, alerts] = await Promise.all([
        getDashboardSummary(),
        getAlertsDetail(),
    ]);

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>
                {ar.reports.dashboard}
            </Title>

            <DashboardCards summary={summary} />

            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} xl={12}>
                    <ProductStatsTable
                        title={ar.reports.topProducts}
                        data={summary.topSellingProducts}
                    />
                </Col>
                <Col xs={24} xl={12}>
                    <ProductStatsTable
                        title={ar.reports.slowProducts}
                        data={summary.slowMovingProducts}
                    />
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                <Col xs={24} lg={12}>
                    <AlertListCard
                        title={ar.alerts.expired}
                        color="red"
                        items={alerts.expired}
                        renderMeta={(item: { batchCount: number }) =>
                            `${item.batchCount} تشغيلة منتهية`
                        }
                    />
                </Col>
                <Col xs={24} lg={12}>
                    <AlertListCard
                        title={ar.alerts.expiringSoon}
                        color="orange"
                        items={alerts.expiringSoon}
                        renderMeta={(item: { earliestExpiry: string; batchCount: number }) =>
                            `أقرب انتهاء: ${item.earliestExpiry} | ${item.batchCount} تشغيلة`
                        }
                    />
                </Col>
                <Col xs={24} lg={12}>
                    <AlertListCard
                        title={ar.alerts.lowStock}
                        color="gold"
                        items={alerts.lowStock}
                        renderMeta={(item: { floorStock: number; lowStockThreshold: number }) =>
                            `المتاح: ${item.floorStock} | الحد الأدنى: ${item.lowStockThreshold}`
                        }
                    />
                </Col>
                <Col xs={24} lg={12}>
                    <AlertListCard
                        title={ar.alerts.outOfStock}
                        color="default"
                        items={alerts.outOfStock}
                        renderMeta={() => 'لا يوجد رصيد على رف الصيدلية'}
                    />
                </Col>
            </Row>

            <Card bordered={false} style={{ marginTop: 24 }}>
                <Space direction="vertical" size={4}>
                    <Text strong>ملخص اليوم</Text>
                    <Text type="secondary">
                        المبيعات: {formatEGP(summary.todaySales)} | الربح: {formatEGP(summary.netProfit)} |
                        النقدية المحصلة: {formatEGP(summary.cashInHand)}
                    </Text>
                    <Text type="secondary">
                        مديونية العملاء: {formatEGP(summary.totalCustomerDebt)} | مستحقات الموردين:{' '}
                        {formatEGP(summary.totalSupplierDebt)}
                    </Text>
                </Space>
            </Card>
        </div>
    );
}
