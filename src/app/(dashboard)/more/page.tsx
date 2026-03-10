'use client';

import { Card, Avatar, Typography, Button, Space, Row, Col } from 'antd';
import {
    UserOutlined,
    LogoutOutlined,
    TruckOutlined,
    FileTextOutlined,
    InboxOutlined,
    BarChartOutlined,
    AuditOutlined,
    SettingOutlined,
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
            title: ar.permissionGroups.stock || 'المخزون والمنتجات',
            items: [
                { key: '/suppliers', icon: <TruckOutlined style={{ fontSize: 24 }} />, label: ar.nav.suppliers, permission: 'suppliers.view' as const },
                { key: '/supplier-invoices', icon: <FileTextOutlined style={{ fontSize: 24 }} />, label: ar.nav.supplierInvoices, permission: 'supplier-invoices.view' as const },
                { key: '/stock', icon: <InboxOutlined style={{ fontSize: 24 }} />, label: ar.nav.stock, permission: 'stock.view' as const },
            ]
        },
        {
            title: ar.permissionGroups.reports || 'التقارير وسجل المراجعة',
            items: [
                { key: '/reports', icon: <BarChartOutlined style={{ fontSize: 24 }} />, label: ar.nav.reports, permission: 'reports.view' as const },
                { key: '/audit-logs', icon: <AuditOutlined style={{ fontSize: 24 }} />, label: ar.nav.auditLogs, permission: 'audit-logs.view' as const },
            ]
        },
        {
            title: ar.permissionGroups.system || 'النظام والإدارة',
            items: [
                { key: '/users', icon: <UserOutlined style={{ fontSize: 24 }} />, label: ar.nav.users, permission: 'users.manage' as const },
                { key: '/settings/units', icon: <SettingOutlined style={{ fontSize: 24 }} />, label: ar.nav.units, permission: 'settings.manage' as const }, // Assuming settings.manage exists or similar
                { key: '/settings', icon: <SettingOutlined style={{ fontSize: 24 }} />, label: ar.nav.settings, permission: 'settings.view' as const },
            ]
        }
    ];

    return (
        <div style={{ paddingBottom: 24 }}>
            {/* User Profile Section */}
            <Card style={{ marginBottom: 24, borderRadius: 12 }}>
                <Space size="large" align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space size="middle">
                        <Avatar size={56} icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                        <div>
                            <Title level={5} style={{ margin: 0 }}>{user?.name}</Title>
                            <Text type="secondary">
                                {user?.role === 'owner' ? ar.users.owner : ar.users.cashier}
                            </Text>
                        </div>
                    </Space>
                    <Button
                        type="primary"
                        danger
                        icon={<LogoutOutlined />}
                        loading={isLoggingOut}
                        onClick={() => logout()}
                        shape="circle"
                        size="large"
                    />
                </Space>
            </Card>

            {/* Navigation Cards */}
            {menuGroups.map((group, groupIdx) => {
                const filteredItems = group.items.filter(item =>
                    !item.permission || hasPermission(item.permission)
                );

                if (filteredItems.length === 0) return null;

                return (
                    <div key={groupIdx} style={{ marginBottom: 24 }}>
                        <Title level={5} style={{ marginBottom: 16, color: '#8c8c8c' }}>{group.title}</Title>
                        <Row gutter={[16, 16]}>
                            {filteredItems.map(item => (
                                <Col span={12} key={item.key}>
                                    <Card
                                        hoverable
                                        onClick={() => router.push(item.key)}
                                        style={{ height: '100%', borderRadius: 12, textAlign: 'center' }}
                                        styles={{ body: { padding: '24px 16px' } }}
                                    >
                                        <div style={{ color: '#1677ff', marginBottom: 16 }}>
                                            {item.icon}
                                        </div>
                                        <Text strong>{item.label}</Text>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>
                );
            })}
        </div>
    );
}
