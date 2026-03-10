'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Grid } from 'antd';
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

export default function BottomTabBar() {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { hasPermission } = usePermissions();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Renders only on mobile after mount
    if (!mounted || screens.md) {
        return null;
    }

    const tabs = [
        {
            key: '/pos',
            icon: <ShoppingCartOutlined className="bottom-tab-icon" />,
            label: ar.nav.pos,
            permission: 'pos.search' as const,
        },
        {
            key: '/products',
            icon: <MedicineBoxOutlined className="bottom-tab-icon" />,
            label: ar.nav.products,
            permission: 'products.view' as const,
        },
        {
            key: '/dashboard',
            icon: <DashboardOutlined className="bottom-tab-icon" />,
            label: ar.nav.dashboard,
            permission: 'reports.view' as const,
        },
        {
            key: '/customers',
            icon: <TeamOutlined className="bottom-tab-icon" />,
            label: ar.nav.customers,
            permission: 'customers.view' as const,
        },
        {
            key: '/more',
            icon: <AppstoreOutlined className="bottom-tab-icon" />,
            label: ar.nav.more,
        },
    ];

    const filteredTabs = tabs.filter(tab => {
        if (tab.permission && !hasPermission(tab.permission)) return false;
        return true;
    });

    return (
        <div className="bottom-tab-bar">
            {filteredTabs.map(tab => {
                const isActive = pathname.startsWith(tab.key) &&
                    (tab.key !== '/dashboard' || pathname === '/dashboard');
                return (
                    <div
                        key={tab.key}
                        className={`bottom-tab-item ${isActive ? 'active' : ''}`}
                        onClick={() => router.push(tab.key)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </div>
                );
            })}
        </div>
    );
}
