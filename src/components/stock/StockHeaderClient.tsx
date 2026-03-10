'use client';

import { Typography, Row, Col, Card, Statistic, Alert } from 'antd';
import { WarningOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import ar from '@/i18n/ar';

const { Title } = Typography;

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
    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>
                {ar.nav.stock}
            </Title>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="منتجات نفذت"
                            value={outOfStockCount}
                            styles={{ content: { color: '#cf1322' } }}
                            prefix={<WarningOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="المخزون المنخفض"
                            value={lowStockCount}
                            styles={{ content: { color: '#d48806' } }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="منتهية الصلاحية"
                            value={expiredCount}
                            styles={{ content: { color: '#cf1322' } }}
                            prefix={<ExclamationCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="تقارب الانتهاء (30 يوم)"
                            value={expiringSoonCount}
                            styles={{ content: { color: '#d48806' } }}
                        />
                    </Card>
                </Col>
            </Row>

            {outOfStockCount > 0 && (
                <Alert
                    title={`يوجد ${outOfStockCount} منتجات نفذت من المخزون`}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}
        </div>
    );
}
