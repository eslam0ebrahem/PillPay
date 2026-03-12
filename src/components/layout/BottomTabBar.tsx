'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// Stable reference — no new object allocated on every render
const NAV_STYLE: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    // Total height grows with the safe-area inset so content is never clipped on iPhone
    height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
    background: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderTop: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-start', // Tabs start at the top; safe-area adds space below
    paddingTop: 0,
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    zIndex: 1001,
    boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
};

interface Tab {
    key: string;
    icon: React.ReactNode;
    label: string;
    permission?: 'pos.search' | 'products.view' | 'reports.view' | 'customers.view';
}

interface TabItemProps {
    tab: Tab;
    isActive: boolean;
    onClick: (key: string) => void;
}

// Memoized — only re-renders when its own isActive state changes,
// not when a sibling tab becomes active
const TabItem = React.memo(function TabItem({ tab, isActive, onClick }: TabItemProps) {
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(tab.key);
            }
        },
        [onClick, tab.key]
    );

    return (
        <Flex
            role="button"
            tabIndex={0}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            vertical
            align="center"
            justify="center"
            onClick={() => onClick(tab.key)}
            onKeyDown={handleKeyDown}
            style={{
                flex: 1,
                height: 64, // Fixed to the visible 64px zone — safe-area is handled by the nav
                cursor: 'pointer',
                position: 'relative',
                color: isActive ? '#1677ff' : '#8c8c8c',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent', // Remove tap flash on iOS
            }}
        >
            {/* Active indicator bar */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    width: '30%',
                    height: 3,
                    background: '#1677ff',
                    borderRadius: '0 0 4px 4px',
                    transition: 'opacity 0.2s ease',
                    opacity: isActive ? 1 : 0,
                    pointerEvents: 'none',
                }}
            />

            <div
                style={{
                    fontSize: 22,
                    marginBottom: 2,
                    lineHeight: 1,
                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.2s ease',
                }}
            >
                {tab.icon}
            </div>

            <Text
                style={{
                    fontSize: 10,
                    color: 'inherit',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'font-weight 0.15s ease',
                    userSelect: 'none',
                }}
            >
                {tab.label}
            </Text>
        </Flex>
    );
});

// Defined at module scope — never changes, so no need to put it inside useMemo
const ALL_TABS: Tab[] = [
    {
        key: '/pos',
        icon: <ShoppingCartOutlined />,
        label: ar.nav.pos,
        permission: 'pos.search',
    },
    {
        key: '/products',
        icon: <MedicineBoxOutlined />,
        label: ar.nav.products,
        permission: 'products.view',
    },
    {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: ar.nav.dashboard,
        permission: 'reports.view',
    },
    {
        key: '/customers',
        icon: <TeamOutlined />,
        label: ar.nav.customers,
        permission: 'customers.view',
    },
    {
        key: '/more',
        icon: <AppstoreOutlined />,
        label: ar.nav.more,
    },
];

export default function BottomTabBar() {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { hasPermission } = usePermissions();

    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = useMemo(
        () => mounted && (screens.xs || (screens.sm && !screens.md)),
        [mounted, screens.xs, screens.sm, screens.md]
    );

    const filteredTabs = useMemo(
        () => ALL_TABS.filter((tab) => !tab.permission || hasPermission(tab.permission)),
        [hasPermission]
    );

    // Prefetch all permitted routes so navigation feels instant
    useEffect(() => {
        if (!isMobile) return;
        filteredTabs.forEach((tab) => router.prefetch(tab.key));
    }, [isMobile, filteredTabs, router]);

    const handleTabClick = useCallback(
        (key: string) => {
            router.push(key);
        },
        [router]
    );

    if (!isMobile) return null;

    return (
        <nav aria-label={'التنقل الرئيسي'} style={NAV_STYLE}>
            {filteredTabs.map((tab) => (
                <TabItem
                    key={tab.key}
                    tab={tab}
                    isActive={pathname.startsWith(tab.key)}
                    onClick={handleTabClick}
                />
            ))}
        </nav>
    );
}
