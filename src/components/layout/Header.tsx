'use client';

import { useState, useEffect } from 'react';
import { Button, Space, Typography, Grid } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import ar from '@/i18n/ar';

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function Header() {
    const { user, logout, isLoggingOut } = useAuth();
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // SSR safe: default to showing on desktop
    const isDesktop = !mounted || screens.md !== false;

    if (!isDesktop) return null;

    return (
        <div className="app-header">
            <div></div>
            <Space size="middle">
                <Space>
                    <UserOutlined />
                    <Text strong>{user?.name}</Text>
                    <Text type="secondary">
                        ({user?.role === 'owner' ? ar.users.owner : ar.users.cashier})
                    </Text>
                </Space>
                <Button
                    type="text"
                    danger
                    icon={<LogoutOutlined />}
                    onClick={() => logout()}
                    loading={isLoggingOut}
                >
                    {ar.auth.logout}
                </Button>
            </Space>
        </div>
    );
}
