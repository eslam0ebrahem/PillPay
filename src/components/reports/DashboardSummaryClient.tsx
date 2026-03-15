'use client';

import type { ReactNode } from 'react';
import { Card, Col, Empty, Row, Space, Tag, Typography, Image, Flex, Divider } from 'antd';
import {
    PictureOutlined,
    FireOutlined,
    CoffeeOutlined,
    WarningOutlined,
    ClockCircleOutlined,
    StopOutlined,
    FallOutlined,
} from '@ant-design/icons';
import DashboardCards from '@/components/reports/DashboardCards';
import PageHeader from '@/components/common/PageHeader';
import { formatEGP } from '@/utils/money';
import ar from '@/i18n/ar';
import type { DashboardProductStat, DashboardSummary } from '@/lib/services/report.service';

const { Text, Title } = Typography;

// --- Helper: Native-feeling Product Avatar ---
const ProductAvatar = ({ src, name }: { src?: string; name: string }) => {
    if (src) {
        return (
            <Image
                src={src}
                alt={name}
                width={40}
                height={40}
                style={{ objectFit: 'cover', borderRadius: 8 }}
                fallback="/no-image.svg"
                preview={false}
            />
        );
    }
    return (
        <div
            style={{
                width: 40,
                height: 40,
                backgroundColor: '#f5f5f5',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 8,
                border: '1px solid #f0f0f0',
            }}
        >
            <PictureOutlined style={{ fontSize: 18, color: '#d9d9d9' }} />
        </div>
    );
};

// --- Optimized Product Stats List ---
function ProductStatsList({
    title,
    data,
    icon,
    color,
}: {
    title: string;
    data: DashboardProductStat[];
    icon: ReactNode;
    color: string;
}) {
    return (
        <Card
            title={
                <Space>
                    <span style={{ color }}>{icon}</span> {title}
                </Space>
            }
            variant="borderless"
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}
            styles={{ body: { padding: '0 12px' } }}
        >
            {data.length === 0 ? (
                <Empty
                    description={ar.actions.noData}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ margin: '24px 0' }}
                />
            ) : (
                <Flex vertical>
                    {data.map((item, index) => (
                        <Flex
                            key={index}
                            align="center"
                            justify="space-between"
                            style={{
                                padding: '12px 0',
                                borderBottom:
                                    index < data.length - 1 ? '1px solid #f0f0f0' : 'none',
                            }}
                        >
                            <Flex align="center" gap={12} style={{ flex: 1 }}>
                                <ProductAvatar src={item.imageUrl} name={item.name} />
                                <Flex vertical>
                                    <Text strong style={{ fontSize: 14, lineHeight: 1.2 }}>
                                        {item.name}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        الكمية المباعة
                                    </Text>
                                </Flex>
                            </Flex>
                            <div style={{ textAlign: 'center', minWidth: 60 }}>
                                <Tag
                                    color={color}
                                    style={{
                                        margin: 0,
                                        fontSize: 14,
                                        padding: '2px 8px',
                                        borderRadius: 12,
                                    }}
                                >
                                    {item.quantity}
                                </Tag>
                            </div>
                        </Flex>
                    ))}
                </Flex>
            )}
        </Card>
    );
}

// --- Optimized Alert List ---
function AlertListCard({
    title,
    color,
    icon,
    items,
    renderMeta,
}: {
    title: string;
    color: string;
    icon: ReactNode;
    items: any[];
    renderMeta?: (item: any) => ReactNode;
}) {
    return (
        <Card
            title={
                <Space>
                    <span style={{ color }}>{icon}</span> {title}
                </Space>
            }
            variant="borderless"
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}
            styles={{ body: { padding: '0 12px' } }}
        >
            {items.length === 0 ? (
                <Empty
                    description="لا توجد تنبيهات"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ margin: '24px 0' }}
                />
            ) : (
                <Flex vertical>
                    {items.map((item, index) => (
                        <Flex
                            key={index}
                            align="center"
                            gap={12}
                            style={{
                                padding: '12px 0',
                                borderBottom:
                                    index < items.length - 1 ? '1px dashed #f0f0f0' : 'none',
                            }}
                        >
                            <ProductAvatar src={item.imageUrl} name={item.nameAr} />
                            <Flex vertical style={{ flex: 1 }}>
                                <Text
                                    strong
                                    style={{
                                        fontSize: 13,
                                        display: 'block',
                                        marginBottom: 4,
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {item.nameAr}
                                </Text>
                                {renderMeta && (
                                    <div>
                                        <Tag
                                            variant="solid"
                                            color={`${color}`}
                                            style={{ margin: 0, fontSize: 11 }}
                                        >
                                            {renderMeta(item)}
                                        </Tag>
                                    </div>
                                )}
                            </Flex>
                        </Flex>
                    ))}
                </Flex>
            )}
        </Card>
    );
}

interface DashboardSummaryClientProps {
    summary: DashboardSummary;
    alerts: {
        expired: any[];
        expiringSoon: any[];
        lowStock: any[];
        outOfStock: any[];
    };
}

export default function DashboardSummaryClient({ summary, alerts }: DashboardSummaryClientProps) {
    return (
        <div style={{ paddingBottom: 24 }}>
            <PageHeader title={ar.reports.dashboard} />

            <DashboardCards summary={summary} />

            {/* Performance Section */}
            <Title level={5} style={{ marginTop: 32, marginBottom: 16, color: '#595959' }}>
                أداء المنتجات
            </Title>
            <Row gutter={[12, 12]}>
                <Col xs={24} lg={12}>
                    <ProductStatsList
                        title={ar.reports.topProducts}
                        data={summary.topSellingProducts}
                        icon={<FireOutlined />}
                        color="#ff4d4f" // Red for hot items
                    />
                </Col>
                <Col xs={24} lg={12}>
                    <ProductStatsList
                        title={ar.reports.slowProducts}
                        data={summary.slowMovingProducts}
                        icon={<CoffeeOutlined />}
                        color="#8c8c8c" // Grey for slow items
                    />
                </Col>
            </Row>

            {/* Alerts Section */}
            <Title level={5} style={{ marginTop: 32, marginBottom: 16, color: '#595959' }}>
                تنبيهات المخزون
            </Title>
            <Row gutter={[12, 12]}>
                <Col xs={24} md={12} lg={6}>
                    <AlertListCard
                        title={ar.alerts.expired}
                        color="error"
                        icon={<StopOutlined />}
                        items={alerts.expired}
                        renderMeta={(item) => `${item.batchCount} تشغيلة منتهية`}
                    />
                </Col>
                <Col xs={24} md={12} lg={6}>
                    <AlertListCard
                        title={ar.alerts.expiringSoon}
                        color="warning"
                        icon={<ClockCircleOutlined />}
                        items={alerts.expiringSoon}
                        renderMeta={(item) => `أقرب انتهاء: ${item.earliestExpiry}`}
                    />
                </Col>
                <Col xs={24} md={12} lg={6}>
                    <AlertListCard
                        title={ar.alerts.lowStock}
                        color="processing"
                        icon={<FallOutlined />}
                        items={alerts.lowStock}
                        renderMeta={(item) =>
                            `المتاح: ${item.floorStock} | الحد: ${item.lowStockThreshold}`
                        }
                    />
                </Col>
                <Col xs={24} md={12} lg={6}>
                    <AlertListCard
                        title={ar.alerts.outOfStock}
                        color="default"
                        icon={<WarningOutlined />}
                        items={alerts.outOfStock}
                        renderMeta={() => 'رصيد الصيدلية: صفر'}
                    />
                </Col>
            </Row>

            {/* Daily Summary Strip */}
            <Card
                variant="borderless"
                style={{
                    marginTop: 32,
                    borderRadius: 12,
                    background: 'linear-gradient(90deg, #f0f5ff 0%, #e6f4ff 100%)',
                    border: '1px solid #91caff',
                }}
                styles={{ body: { padding: '16px 20px' } }}
            >
                <Flex vertical gap={12}>
                    <Text strong style={{ color: '#003a8c', fontSize: 16 }}>
                        ملخص الخزينة (اليوم)
                    </Text>
                    <Flex wrap="wrap" gap={16} justify="space-between">
                        <Space orientation="vertical" size={0}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                المبيعات
                            </Text>
                            <Text strong style={{ fontSize: 15 }}>
                                {formatEGP(summary.todaySales)}
                            </Text>
                        </Space>
                        <Space orientation="vertical" size={0}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                الربح الصافي
                            </Text>
                            <Text strong style={{ fontSize: 15, color: '#389e0d' }}>
                                {formatEGP(summary.netProfit)}
                            </Text>
                        </Space>
                        <Space orientation="vertical" size={0}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                النقدية بالدرج
                            </Text>
                            <Text strong style={{ fontSize: 15, color: '#d46b08' }}>
                                {formatEGP(summary.cashInHand)}
                            </Text>
                        </Space>
                    </Flex>
                </Flex>
            </Card>
        </div>
    );
}
