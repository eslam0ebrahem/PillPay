'use client';

import { Card, Col, Row, Statistic } from 'antd';
import {
    DollarOutlined,
    LineChartOutlined,
    BankOutlined,
    UsergroupAddOutlined,
    ShopOutlined,
} from '@ant-design/icons';
import MoneyDisplay from '../common/MoneyDisplay';
import ar from '@/i18n/ar';
import type { DashboardSummary } from '@/lib/services/report.service';

interface DashboardCardsProps {
    summary: DashboardSummary;
}

export default function DashboardCards({ summary }: DashboardCardsProps) {
    return (
        <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
                <Card bordered={false}>
                    <Statistic
                        title={ar.reports.todaySales}
                        value={summary.todaySales}
                        formatter={(val) => <MoneyDisplay amount={Number(val)} />}
                        prefix={<LineChartOutlined style={{ color: '#1677ff' }} />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
                <Card bordered={false}>
                    <Statistic
                        title={ar.reports.totalProfit}
                        value={summary.netProfit}
                        formatter={(val) => <MoneyDisplay amount={Number(val)} />}
                        prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
                <Card bordered={false}>
                    <Statistic
                        title={ar.reports.cashInHand}
                        value={summary.cashInHand}
                        formatter={(val) => <MoneyDisplay amount={Number(val)} />}
                        prefix={<BankOutlined style={{ color: '#faad14' }} />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={12} lg={12}>
                <Card bordered={false}>
                    <Statistic
                        title={ar.reports.customerDebt}
                        value={summary.totalCustomerDebt}
                        formatter={(val) => <MoneyDisplay amount={Number(val)} />}
                        prefix={<UsergroupAddOutlined style={{ color: '#ff4d4f' }} />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={12} lg={12}>
                <Card bordered={false}>
                    <Statistic
                        title={ar.reports.supplierDebt}
                        value={summary.totalSupplierDebt}
                        formatter={(val) => <MoneyDisplay amount={Number(val)} />}
                        prefix={<ShopOutlined style={{ color: '#eb2f96' }} />}
                    />
                </Card>
            </Col>
        </Row>
    );
}
