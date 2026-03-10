'use client';

import { Menu } from 'antd';
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
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import ar from '@/i18n/ar';
import type { PermissionKey } from '@/lib/types';

interface MenuItem {
    key: string;
    icon: React.ReactNode;
    label: string;
    permission?: PermissionKey;
    ownerOnly?: boolean;
}

const menuItems: MenuItem[] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: ar.nav.dashboard, permission: 'reports.view' },
    { key: '/pos', icon: <ShoppingCartOutlined />, label: ar.nav.pos, permission: 'pos.search' },
    { key: '/products', icon: <MedicineBoxOutlined />, label: ar.nav.products, permission: 'products.view' },
    { key: '/customers', icon: <TeamOutlined />, label: ar.nav.customers, permission: 'customers.view' },
    { key: '/suppliers', icon: <TruckOutlined />, label: ar.nav.suppliers, permission: 'suppliers.view' },
    { key: '/supplier-invoices', icon: <FileTextOutlined />, label: ar.nav.supplierInvoices, permission: 'supplier-invoices.view' },
    { key: '/stock', icon: <InboxOutlined />, label: ar.nav.stock, permission: 'stock.view' },
    { key: '/reports', icon: <BarChartOutlined />, label: ar.nav.reports, permission: 'reports.view' },
    { key: '/audit-logs', icon: <AuditOutlined />, label: ar.nav.auditLogs, permission: 'audit-logs.view' },
    { key: '/users', icon: <UserOutlined />, label: ar.nav.users, permission: 'users.manage' },
    { key: '/settings/units', icon: <SettingOutlined />, label: ar.nav.units, permission: 'users.manage' },
    { key: '/settings', icon: <SettingOutlined />, label: ar.nav.settings, permission: 'settings.view' },
];

export default function Sidebar({ collapsed, isMobile }: { collapsed?: boolean; isMobile?: boolean }) {
    const pathname = usePathname();
    const router = useRouter();
    const { hasPermission, isOwner } = usePermissions();

    const filteredItems = menuItems.filter((item) => {
        if (item.ownerOnly && !isOwner) return false;
        if (item.permission && !hasPermission(item.permission)) return false;
        return true;
    });

    const antdItems = filteredItems.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
    }));

    const activeKey = menuItems.find((item) =>
        pathname.startsWith(item.key)
    )?.key;

    return (
        <div className={isMobile ? "mobile-sidebar" : "app-sidebar"} style={isMobile ? { height: '100%', display: 'flex', flexDirection: 'column' } : { width: collapsed ? 80 : 260 }}>
            <div className="logo" style={isMobile ? { color: '#001529' } : {}}>
                {collapsed ? 'PP' : 'PillPay'}
            </div>
            <Menu
                theme={isMobile ? "light" : "dark"}
                mode="inline"
                selectedKeys={activeKey ? [activeKey] : []}
                items={antdItems}
                onClick={({ key }) => {
                    router.push(key);
                }}
                inlineCollapsed={isMobile ? false : collapsed}
                style={isMobile ? { borderRight: 0 } : {}}
            />
        </div>
    );
}
