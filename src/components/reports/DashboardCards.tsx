'use client';

import React from 'react';
import { Card, Col, Row, Typography, Flex } from 'antd';
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

const { Text, Title } = Typography;

interface DashboardCardsProps {
    summary: DashboardSummary;
}

export default function DashboardCards({ summary }: DashboardCardsProps) {
    // Helper component for consistent, premium card styling
    const StatCard = ({ 
        title, 
        value, 
        icon, 
        color, 
        isHero = false 
    }: { 
        title: string; 
        value: number; 
        icon: React.ReactNode; 
        color: string;
        isHero?: boolean;
    }) => (
        <Card 
            variant="borderless"
            style={{ 
                borderRadius: 16, 
                boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                height: '100%' // Ensures cards in the same row stretch equally
            }} 
            styles={{ 
                body: { padding: isHero ? '24px 20px' : '16px 12px' } 
            }}
        >
            <Flex justify="space-between" align="flex-start">
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text type="secondary" style={{ fontSize: isHero ? 15 : 13, display: 'block', marginBottom: 4 }}>
                        {title}
                    </Text>
                    {/* minWidth: 0 and truncate styles prevent large numbers from breaking the layout */}
                    <Title 
                        level={isHero ? 2 : 4} 
                        style={{ 
                            margin: 0, 
                            color: '#1f1f1f',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <MoneyDisplay amount={Number(value)} />
                    </Title>
                </div>
                
                {/* Premium Native-App Icon Wrapper */}
                <div style={{ 
                    backgroundColor: `${color}15`, // Adds 15% opacity tint to the base color
                    padding: isHero ? 14 : 10, 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginInlineStart: 12 // RTL safe margin
                }}>
                    {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { 
                        style: { fontSize: isHero ? 28 : 20, color } 
                    })}
                </div>
            </Flex>
        </Card>
    );

    return (
        <Row gutter={[12, 12]}>
            {/* Hero Metric: Today's Sales (Full width on mobile) */}
            <Col xs={24} sm={24} lg={8}>
                <StatCard
                    title={ar.reports.todaySales}
                    value={summary.todaySales}
                    icon={<LineChartOutlined />}
                    color="#1677ff" // Ant Design Primary Blue
                    isHero={true}
                />
            </Col>

            {/* Sub-Metrics: 2x2 Grid on Mobile */}
            <Col xs={12} sm={12} lg={8}>
                <StatCard
                    title={ar.reports.totalProfit}
                    value={summary.netProfit}
                    icon={<DollarOutlined />}
                    color="#52c41a" // Success Green
                />
            </Col>
            <Col xs={12} sm={12} lg={8}>
                <StatCard
                    title={ar.reports.cashInHand}
                    value={summary.cashInHand}
                    icon={<BankOutlined />}
                    color="#faad14" // Warning Gold
                />
            </Col>
            
            <Col xs={12} sm={12} lg={12}>
                <StatCard
                    title={ar.reports.customerDebt}
                    value={summary.totalCustomerDebt}
                    icon={<UsergroupAddOutlined />}
                    color="#ff4d4f" // Danger Red
                />
            </Col>
            <Col xs={12} sm={12} lg={12}>
                <StatCard
                    title={ar.reports.supplierDebt}
                    value={summary.totalSupplierDebt}
                    icon={<ShopOutlined />}
                    color="#eb2f96" // Magenta
                />
            </Col>
        </Row>
    );
}