'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Grid } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileTopBar from './MobileTopBar';
import BottomTabBar from './BottomTabBar';

const { useBreakpoint } = Grid;

export default function AppShell({ children }: { children: React.ReactNode }) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    // SSR safe responsive logic
    const isDesktop = !mounted || screens.md !== false;

    return (
        <div className="app-shell">
            {/* Desktop Sidebar */}
            {isDesktop && <Sidebar />}

            <div className="app-content">
                <MobileTopBar />
                <Header />
                <main className="app-main">{children}</main>
            </div>

            <BottomTabBar />
        </div>
    );
}
