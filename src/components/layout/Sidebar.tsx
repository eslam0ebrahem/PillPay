'use client';

import React, { useMemo } from 'react';
import { Menu, Flex, Typography } from 'antd';
import {
    DashboardOutlined,
    ShoppingCartOutlined,
    MedicineBoxOutlined,
    TeamOutlined,
    TruckOutlined,
    FileTextOutlined,
    InboxOutlined,
    BarChartOutlined,
    AuditOutlined,
    UserOutlined,
    SettingOutlined,
    SafetyCertificateOutlined,
    AppstoreOutlined
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import ar from '@/i18n/ar';
import type { PermissionKey } from '@/lib/types';
import type { MenuProps } from 'antd';

const { Title } = Typography;

// --- Types ---
interface MenuRouteItem {
    key: string;
    icon?: React.ReactNode;
    label: string;
    permission?: PermissionKey;
    ownerOnly?: boolean;
    children?: MenuRouteItem[];
}

interface SidebarProps {
    collapsed?: boolean;
    isMobile?: boolean;
    onClose?: () => void; // Critical for mobile UX
}

// --- Menu Configuration ---
// Utilizing nested children for better cognitive grouping
const menuConfig: MenuRouteItem[] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: ar.nav.dashboard, permission: 'reports.view' },
    { key: '/pos', icon: <ShoppingCartOutlined />, label: ar.nav.pos, permission: 'pos.search' },
    { key: '/products', icon: <MedicineBoxOutlined />, label: ar.nav.products, permission: 'products.view' },
    { key: '/stock', icon: <InboxOutlined />, label: ar.nav.stock, permission: 'stock.view' },
    { key: '/customers', icon: <TeamOutlined />, label: ar.nav.customers, permission: 'customers.view' },
    
    // Grouping Supplier operations
    { 
        key: '/supplier-group', 
        icon: <TruckOutlined />, 
        label: 'الموردين والمشتريات', 
        children: [
            { key: '/suppliers', label: ar.nav.suppliers, permission: 'suppliers.view' },
            { key: '/supplier-invoices', icon: <FileTextOutlined />, label: ar.nav.supplierInvoices, permission: 'supplier-invoices.view' },
        ]
    },

    { key: '/reports', icon: <BarChartOutlined />, label: ar.nav.reports, permission: 'reports.view' },
    
    // Grouping Administration operations
    {
        key: '/admin-group',
        icon: <SafetyCertificateOutlined />,
        label: 'الإدارة والإعدادات',
        children: [
            { key: '/audit-logs', icon: <AuditOutlined />, label: ar.nav.auditLogs, permission: 'audit-logs.view' },
            { key: '/users', icon: <UserOutlined />, label: ar.nav.users, permission: 'users.manage' },
            { key: '/settings/units', icon: <AppstoreOutlined />, label: ar.nav.units, permission: 'users.manage' },
            { key: '/settings', icon: <SettingOutlined />, label: ar.nav.settings, permission: 'settings.view' },
        ]
    }
];

export default function Sidebar({ collapsed = false, isMobile = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { hasPermission, isOwner } = usePermissions();

    // Recursive function to filter items based on permissions
    const filterItems = (items: MenuRouteItem[]): MenuRouteItem[] => {
        return items
            .filter((item) => {
                if (item.ownerOnly && !isOwner) return false;
                if (item.permission && !hasPermission(item.permission)) return false;
                return true;
            })
            .map((item) => {
                if (item.children) {
                    const filteredChildren = filterItems(item.children);
                    // Only keep the parent group if it has accessible children
                    if (filteredChildren.length === 0) return null;
                    return { ...item, children: filteredChildren };
                }
                return item;
            })
            .filter(Boolean) as MenuRouteItem[];
    };

    // Memoize the filtered menu so it doesn't recalculate on every re-render
    const allowedMenuConfig = useMemo(() => filterItems(menuConfig), [hasPermission, isOwner]);

    // Map to Ant Design's expected ItemType format
    const mapToAntdItems = (items: MenuRouteItem[]): MenuProps['items'] => {
        return items.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            children: item.children ? mapToAntdItems(item.children) : undefined,
        }));
    };

    const antdItems = useMemo(() => mapToAntdItems(allowedMenuConfig), [allowedMenuConfig]);

    // Flatten keys to find the exact active route
    // Sort by length descending so '/settings/units' matches before '/settings'
    const flattenKeys = (items: MenuRouteItem[]): string[] => {
        let keys: string[] = [];
        items.forEach(item => {
            if (item.children) keys = [...keys, ...flattenKeys(item.children)];
            else keys.push(item.key);
        });
        return keys;
    };

    const activeKey = useMemo(() => {
        const allKeys = flattenKeys(allowedMenuConfig).sort((a, b) => b.length - a.length);
        return allKeys.find((key) => pathname.startsWith(key)) || '';
    }, [pathname, allowedMenuConfig]);

    return (
        <Flex 
            vertical 
            style={{ 
                height: '100%', 
                background: isMobile ? '#fff' : '#001529',
                width: isMobile ? '100%' : (collapsed ? 80 : 260),
                transition: 'width 0.2s'
            }}
        >
            {/* Logo Area */}
            <Flex 
                align="center" 
                justify="center" 
                style={{ 
                    height: 64, 
                    padding: collapsed ? '0 8px' : '0 24px',
                    borderBottom: `1px solid ${isMobile ? '#f0f0f0' : 'rgba(255, 255, 255, 0.1)'}`
                }}
            >
                <Title 
                    level={4} 
                    style={{ 
                        margin: 0, 
                        color: isMobile ? '#1677ff' : '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                    }}
                >
                    {collapsed ? 'PP' : 'PillPay'}
                </Title>
            </Flex>

            {/* Navigation Menu */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                <Menu
                    theme={isMobile ? "light" : "dark"}
                    mode="inline"
                    selectedKeys={[activeKey]}
                    defaultOpenKeys={isMobile ? ['/admin-group', '/supplier-group'] : []} // Expand groups by default on mobile
                    items={antdItems}
                    onClick={({ key }) => {
                        router.push(key);
                        // Auto-close the sidebar on mobile when a link is clicked
                        if (isMobile && onClose) {
                            onClose();
                        }
                    }}
                    inlineCollapsed={isMobile ? false : collapsed}
                    style={{ borderInlineEnd: 0, paddingBottom: 24 }}
                />
            </div>
        </Flex>
    );
}