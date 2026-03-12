'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Grid, Flex, Typography } from 'antd';
import {
    ShoppingCartOutlined,
    MedicineBoxOutlined,
    DashboardOutlined,
    TeamOutlined,
    AppstoreOutlined,
} from '@ant-design/icons';
import { usePermissions } from '@/hooks/usePermissions';
import ar from '@/i18n/ar';

const { useBreakpoint } = Grid;
const { Text } = Typography;

export default function BottomTabBar() {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { hasPermission } = usePermissions();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Only render on mobile devices after hydration
    const isMobile = mounted && (screens.xs || (screens.sm && !screens.md));

    const tabs = useMemo(() => [
        {
            key: '/pos',
            icon: <ShoppingCartOutlined />,
            label: ar.nav.pos,
            permission: 'pos.search' as const,
        },
        {
            key: '/products',
            icon: <MedicineBoxOutlined />,
            label: ar.nav.products,
            permission: 'products.view' as const,
        },
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: ar.nav.dashboard,
            permission: 'reports.view' as const,
        },
        {
            key: '/customers',
            icon: <TeamOutlined />,
            label: ar.nav.customers,
            permission: 'customers.view' as const,
        },
        {
            key: '/more',
            icon: <AppstoreOutlined />,
            label: ar.nav.more,
        },
    ], []);

    if (!isMobile) return null;

    const filteredTabs = tabs.filter(tab => {
        if (tab.permission && !hasPermission(tab.permission)) return false;
        return true;
    });

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            paddingBottom: 'env(safe-area-inset-bottom)', // Support for iPhone "Home Bar"
            zIndex: 1001,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
        }}>
            {filteredTabs.map(tab => {
                // Determine if tab is active (including sub-routes)
                const isActive = pathname.startsWith(tab.key);

                return (
                    <Flex
                        key={tab.key}
                        vertical
                        align="center"
                        justify="center"
                        onClick={() => router.push(tab.key)}
                        style={{
                            flex: 1,
                            height: '100%',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            color: isActive ? '#1677ff' : '#8c8c8c'
                        }}
                    >
                        {/* Visual indicator bar for active tab */}
                        {isActive && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                width: '30%',
                                height: 3,
                                background: '#1677ff',
                                borderRadius: '0 0 4px 4px'
                            }} />
                        )}

                        <div style={{ 
                            fontSize: 22, 
                            marginBottom: 2,
                            transform: isActive ? 'scale(1.1)' : 'scale(1)',
                            transition: 'transform 0.2s ease'
                        }}>
                            {tab.icon}
                        </div>
                        
                        <Text style={{ 
                            fontSize: 10, 
                            color: 'inherit',
                            fontWeight: isActive ? 600 : 400 
                        }}>
                            {tab.label}
                        </Text>
                    </Flex>
                );
            })}
        </nav>
    );
}