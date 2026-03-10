'use client';

import { Button, Space, Typography, Grid } from 'antd';
import { LogoutOutlined, UserOutlined, MenuOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import ar from '@/i18n/ar';

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const { user, logout, isLoggingOut } = useAuth();
    const screens = useBreakpoint();

    return (
        <div className="app-header">
            <div>
                {!screens.md && (
                    <Button
                        type="text"
                        icon={<MenuOutlined />}
                        onClick={onMenuClick}
                        style={{ fontSize: '18px', marginRight: '-12px' }}
                    />
                )}
            </div>
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
