'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Grid } from 'antd';
import ar from '@/i18n/ar';

const { useBreakpoint } = Grid;

export default function MobileTopBar({ rightAction }: { rightAction?: React.ReactNode }) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Renders only on mobile after mount
    if (!mounted || screens.md !== false) {
        return null;
    }

    let title: string = ar.appName;
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) title = ar.nav.dashboard;
    else if (pathname.startsWith('/pos')) title = ar.nav.pos;
    else if (pathname.startsWith('/products')) title = ar.nav.products;
    else if (pathname.startsWith('/customers')) title = ar.nav.customers;
    else if (pathname.startsWith('/supplier-invoices')) title = ar.nav.supplierInvoices;
    else if (pathname.startsWith('/suppliers')) title = ar.nav.suppliers;
    else if (pathname.startsWith('/stock')) title = ar.nav.stock;
    else if (pathname.startsWith('/reports')) title = ar.nav.reports;
    else if (pathname.startsWith('/audit-logs')) title = ar.nav.auditLogs;
    else if (pathname.startsWith('/users')) title = ar.nav.users;
    else if (pathname.startsWith('/settings/units')) title = ar.nav.units;
    else if (pathname.startsWith('/settings')) title = ar.nav.settings;
    else if (pathname.startsWith('/more')) title = ar.nav.more;

    return (
        <div className="mobile-top-bar">
            {/* Contextual actions slot */}
            <div className="mobile-top-bar-title">{title}</div>
            {rightAction && <div className="mobile-top-bar-action">{rightAction}</div>}
        </div>
    );
}
