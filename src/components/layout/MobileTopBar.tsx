'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Grid, Button, Flex, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import ar from '@/i18n/ar';

const { useBreakpoint } = Grid;
const { Title } = Typography;

export default function MobileTopBar({ rightAction }: { rightAction?: React.ReactNode }) {
    const screens = useBreakpoint();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Configuration map for cleaner title lookups
    const titleMap = useMemo(() => ({
        '/dashboard': ar.nav.dashboard,
        '/pos': ar.nav.pos,
        '/products': ar.nav.products,
        '/customers': ar.nav.customers,
        '/supplier-invoices': ar.nav.supplierInvoices,
        '/suppliers': ar.nav.suppliers,
        '/stock': ar.nav.stock,
        '/reports': ar.nav.reports,
        '/audit-logs': ar.nav.auditLogs,
        '/users': ar.nav.users,
        '/settings/units': ar.nav.units,
        '/settings': ar.nav.settings,
        '/more': ar.nav.more,
    }), []);

    // Only render on mobile after hydration
    if (!mounted || (screens.md !== undefined && screens.md)) {
        return null;
    }

    // Determine the title dynamically
    const getActiveTitle = () => {
        // Sort keys by length descending to match /settings/units before /settings
        const sortedKeys = Object.keys(titleMap).sort((a, b) => b.length - a.length);
        const match = sortedKeys.find(key => pathname.startsWith(key));
        return match ? titleMap[match as keyof typeof titleMap] : ar.appName;
    };

    // Determine if we should show a back button
    // Show back button if we are deeper than the top-level (e.g., /products/edit/123)
    const segments = pathname.split('/').filter(Boolean);
    const showBack = segments.length > 1 && pathname !== '/dashboard';

    return (
        <div style={{
            height: 56,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(10px)', // Glassmorphism effect
            WebkitBackdropFilter: 'blur(10px)',
            borderBottom: '1px solid #f0f0f0',
        }}>
            <Flex align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
                {showBack && (
                    <Button 
                        type="text" 
                        icon={<ArrowRightOutlined />} // Arabic uses Right Arrow for "Back"
                        onClick={() => router.back()}
                        style={{ padding: 0, width: 32 }}
                    />
                )}
                <Title 
                    level={5} 
                    style={{ 
                        margin: 0, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
                    }}
                >
                    {getActiveTitle()}
                </Title>
            </Flex>

            {rightAction && (
                <div style={{ flexShrink: 0, marginInlineStart: 8 }}>
                    {rightAction}
                </div>
            )}
        </div>
    );
}