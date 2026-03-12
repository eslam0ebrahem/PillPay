'use client';

import React from 'react';
import { Card, Avatar, Typography, Button, Space, Row, Col, Flex, Divider } from 'antd';
import {
    UserOutlined,
    LogoutOutlined,
    TruckOutlined,
    FileTextOutlined,
    InboxOutlined,
    BarChartOutlined,
    AuditOutlined,
    SettingOutlined,
    RightOutlined,
    AppstoreOutlined,
    SafetyCertificateOutlined
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import ar from '@/i18n/ar';

const { Title, Text } = Typography;

export default function MorePage() {
    const { user, logout, isLoggingOut } = useAuth();
    const { hasPermission } = usePermissions();
    const router = useRouter();

    const menuGroups = [
        {
            title: ar.permissionGroups?.stock || 'إدارة المخزون',
            icon: <InboxOutlined />,
            items: [
                { key: '/suppliers', icon: <TruckOutlined />, label: ar.nav.suppliers, permission: 'suppliers.view' as const },
                { key: '/supplier-invoices', icon: <FileTextOutlined />, label: ar.nav.supplierInvoices, permission: 'supplier-invoices.view' as const },
                { key: '/stock', icon: <InboxOutlined />, label: ar.nav.stock, permission: 'stock.view' as const },
            ]
        },
        {
            title: ar.permissionGroups?.reports || 'التقارير والبيانات',
            icon: <BarChartOutlined />,
            items: [
                { key: '/reports', icon: <BarChartOutlined />, label: ar.nav.reports, permission: 'reports.view' as const },
                { key: '/audit-logs', icon: <AuditOutlined />, label: ar.nav.auditLogs, permission: 'audit-logs.view' as const },
            ]
        },
        {
            title: ar.permissionGroups?.system || 'إعدادات النظام',
            icon: <SettingOutlined />,
            items: [
                { key: '/users', icon: <UserOutlined />, label: ar.nav.users, permission: 'users.manage' as const },
                { key: '/settings/units', icon: <AppstoreOutlined />, label: ar.nav.units, permission: 'users.manage' as const },
                { key: '/settings', icon: <SettingOutlined />, label: ar.nav.settings, permission: 'settings.view' as const },
            ]
        }
    ];

    return (
        <div style={{ padding: '8px 4px 100px 4px' }}>
            {/* --- Premium Profile Header --- */}
            <Card 
                variant="borderless" 
                style={{ 
                    marginBottom: 32, 
                    borderRadius: 16, 
                    background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                    boxShadow: '0 4px 12px rgba(22, 119, 255, 0.2)'
                }}
            >
                <Flex align="center" justify="space-between">
                    <Space size="middle">
                        <Avatar 
                            size={64} 
                            icon={<UserOutlined />} 
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)' }} 
                        />
                        <Flex vertical>
                            <Title level={4} style={{ margin: 0, color: '#fff' }}>{user?.name}</Title>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                                {user?.role === 'owner' ? ar.users.owner : ar.users.cashier}
                            </Text>
                        </Flex>
                    </Space>
                    <Button
                        type="text"
                        icon={<LogoutOutlined style={{ color: '#fff', fontSize: 20 }} />}
                        loading={isLoggingOut}
                        onClick={() => logout()}
                        style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '50%', height: 44, width: 44 }}
                    />
                </Flex>
            </Card>

            {/* --- Navigation Grid --- */}
            {menuGroups.map((group, groupIdx) => {
                const filteredItems = group.items.filter(item =>
                    !item.permission || hasPermission(item.permission)
                );

                if (filteredItems.length === 0) return null;

                return (
                    <div key={groupIdx} style={{ marginBottom: 32 }}>
                        <Flex align="center" gap={8} style={{ marginBottom: 16, paddingLeft: 8 }}>
                            <span style={{ color: '#1677ff', display: 'flex' }}>{group.icon}</span>
                            <Text strong type="secondary" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {group.title}
                            </Text>
                        </Flex>

                        <Row gutter={[12, 12]}>
                            {filteredItems.map(item => (
                                <Col span={8} key={item.key}>
                                    <Flex 
                                        vertical 
                                        align="center" 
                                        justify="center"
                                        onClick={() => router.push(item.key)}
                                        style={{ 
                                            background: '#fff', 
                                            padding: '20px 8px', 
                                            borderRadius: 16,
                                            border: '1px solid #f0f0f0',
                                            cursor: 'pointer',
                                            height: '100%',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <div style={{ 
                                            fontSize: 24, 
                                            color: '#1677ff', 
                                            marginBottom: 8,
                                            background: '#e6f4ff',
                                            width: 48,
                                            height: 48,
                                            borderRadius: 12,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {item.icon}
                                        </div>
                                        <Text 
                                            style={{ 
                                                fontSize: 11, 
                                                textAlign: 'center', 
                                                lineHeight: 1.2,
                                                fontWeight: 500
                                            }}
                                        >
                                            {item.label}
                                        </Text>
                                    </Flex>
                                </Col>
                            ))}
                        </Row>
                    </div>
                );
            })}

            {/* --- Footer Branding --- */}
            <Divider plain>
                <Text type="secondary" style={{ fontSize: 12 }}>{ar.appName} v1.0.4</Text>
            </Divider>
        </div>
    );
}