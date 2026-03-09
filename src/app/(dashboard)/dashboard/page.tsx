export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { Typography, Row, Col, Card, Alert, Skeleton } from 'antd';
import { getDashboardSummary } from '@/lib/services/report.service';
import { getAlertsSummary } from '@/lib/services/alerts.service';
import DashboardCards from '@/components/reports/DashboardCards';
import ar from '@/i18n/ar';

const { Title } = Typography;

async function DashboardOverview() {
    const [summary, alerts] = await Promise.all([
        getDashboardSummary(),
        getAlertsSummary(),
    ]);

    return (
        <>
            <DashboardCards summary={summary} />

            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={12}>
                    <Card title={ar.alerts.expired} bordered={false}>
                        {alerts.expiredBatchesCount > 0 ? (
                            <Alert
                                message={`يوجد ${alerts.expiredBatchesCount} تشغيلة منتهية الصلاحية`}
                                type="error"
                                showIcon
                            />
                        ) : (
                            <Alert message="لا يوجد تشغيلات منتهية" type="success" showIcon />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title={ar.alerts.lowStock} bordered={false}>
                        {alerts.lowStockProductsCount > 0 ? (
                            <Alert
                                message={`يوجد ${alerts.lowStockProductsCount} منتج منخفض المخزون، و ${alerts.outOfStockProductsCount} منتج نفذ تماماً`}
                                type="warning"
                                showIcon
                            />
                        ) : (
                            <Alert message="حالة المخزون جيدة" type="success" showIcon />
                        )}
                    </Card>
                </Col>
            </Row>
        </>
    );
}

export default function DashboardPage() {
    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>
                {ar.reports.dashboard}
            </Title>

            <Suspense fallback={<Skeleton active paragraph={{ rows: 6 }} />}>
                <DashboardOverview />
            </Suspense>
        </div>
    );
}
