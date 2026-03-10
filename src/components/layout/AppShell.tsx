'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Drawer, Grid } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';

const { useBreakpoint } = Grid;

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const screens = useBreakpoint();

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    return (
        <div className="app-shell">
            {/* Desktop Sidebar */}
            {screens.md !== false && <Sidebar />}

            {/* Mobile Sidebar Drawer */}
            <Drawer
                title="PillPay"
                placement="right"
                onClose={() => setMobileMenuOpen(false)}
                open={mobileMenuOpen}
                width={280}
                styles={{ body: { padding: 0 } }}
            >
                <Sidebar isMobile />
            </Drawer>

            <div className="app-content">
                <Header onMenuClick={() => setMobileMenuOpen(true)} />
                <main className="app-main">{children}</main>
            </div>
        </div>
    );
}
