'use client';

import React from 'react';
import { Row, Col, Card, Statistic, Alert, Flex, Typography, Grid } from 'antd';
import { 
    WarningOutlined, 
    ExclamationCircleOutlined, 
    CalendarOutlined, 
    StopOutlined,
    ArrowRightOutlined
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import ar from '@/i18n/ar';

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface StockHeaderClientProps {
    outOfStockCount: number;
    lowStockCount: number;
    expiredCount: number;
    expiringSoonCount: number;
}

export default function StockHeaderClient({
    outOfStockCount,
    lowStockCount,
    expiredCount,
    expiringSoonCount,
}: StockHeaderClientProps) {
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    // We only show the "Urgent Action" alert if there's a mix of severe issues
    const hasSevereIssues = outOfStockCount > 0 || expiredCount > 0;

    return (
        <div style={{ marginBottom: isMobile ? 12 : 24 }}>
            <PageHeader title={ar.nav.stock} />

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {/* Out of Stock - Critical */}
                <Col xs={12} md={6}>
                    <Card size="small" hoverable>
                        <Statistic
                            title={<Text type="secondary">منتجات نفذت</Text>}
                            value={outOfStockCount}
                            valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
                            prefix={<StopOutlined />}
                        />
                    </Card>
                </Col>

                {/* Expired - Critical */}
                <Col xs={12} md={6}>
                    <Card size="small" hoverable>
                        <Statistic
                            title={<Text type="secondary">منتهية الصلاحية</Text>}
                            value={expiredCount}
                            valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
                            prefix={<ExclamationCircleOutlined />}
                        />
                    </Card>
                </Col>

                {/* Low Stock - Warning */}
                <Col xs={12} md={6}>
                    <Card size="small" hoverable>
                        <Statistic
                            title={<Text type="secondary">نواقص (قريباً)</Text>}
                            value={lowStockCount}
                            valueStyle={{ color: '#d48806' }}
                            prefix={<WarningOutlined />}
                        />
                    </Card>
                </Col>

                {/* Expiring Soon - Warning */}
                <Col xs={12} md={6}>
                    <Card size="small" hoverable>
                        <Statistic
                            title={<Text type="secondary">تقارب الانتهاء</Text>}
                            value={expiringSoonCount}
                            valueStyle={{ color: '#d48806' }}
                            prefix={<CalendarOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {hasSevereIssues && (
                <Alert
                    message={
                        <Flex justify="space-between" align="center">
                            <Text strong type="danger">
                                تنبيه: يوجد بنود تتطلب اتخاذ إجراء فوري (نفاذ مخزون أو انتهاء صلاحية)
                            </Text>
                            {!isMobile && <ArrowRightOutlined />}
                        </Flex>
                    }
                    type="error"
                    showIcon
                    style={{ 
                        borderRadius: 8, 
                        border: 'none', 
                        boxShadow: '0 2px 8px rgba(207, 19, 34, 0.1)' 
                    }}
                />
            )}
        </div>
    );
}