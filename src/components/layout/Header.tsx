'use client';

import React, { useState, useEffect } from 'react';
import { Button, Space, Typography, Grid, Avatar, Divider, Tag, Flex } from 'antd';
import { LogoutOutlined, UserOutlined, ShopOutlined } from '@ant-design/icons';
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

    // SSR safe: Only show on screens Medium (768px) and up
    const isDesktop = mounted && (screens.md !== false);

    if (!isDesktop) return null;

    return (
        <header style={{
            height: 64,
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            {/* Left Side: Context / Branding */}
            <Flex align="center" gap={8}>
                <ShopOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                <Text strong style={{ fontSize: 16 }}>{ar.appName}</Text>
                <Divider orientation="vertical" />
                <Tag variant="filled" color="blue">
                    النسخة التجريبية v1.0
                </Tag>
            </Flex>

            {/* Right Side: User Profile & Actions */}
            <Space size="large">
                <Flex align="center" gap={12}>
                    <Flex vertical align="flex-end" gap={0}>
                        <Text strong style={{ lineHeight: 1 }}>{user?.name}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {user?.role === 'owner' ? ar.users.owner : ar.users.cashier}
                        </Text>
                    </Flex>
                    <Avatar 
                        icon={<UserOutlined />} 
                        style={{ backgroundColor: '#1677ff', cursor: 'default' }} 
                    />
                </Flex>

                <Divider orientation="vertical" style={{ height: 24 }} />

                <Button
                    type="primary"
                    danger
                    ghost
                    icon={<LogoutOutlined />}
                    onClick={() => logout()}
                    loading={isLoggingOut}
                    style={{ borderRadius: 8 }}
                >
                    {ar.auth.logout}
                </Button>
            </Space>
        </header>
    );
}