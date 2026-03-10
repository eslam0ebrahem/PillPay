'use client';

import { usePathname } from 'next/navigation';
import { Grid } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileTopBar from './MobileTopBar';
import BottomTabBar from './BottomTabBar';

const { useBreakpoint } = Grid;

export default function AppShell({ children }: { children: React.ReactNode }) {
    const screens = useBreakpoint();
    const pathname = usePathname();

    return (
        <div className="app-shell">
            {/* Desktop Sidebar */}
            {screens.md !== false && <Sidebar />}

            <div className="app-content">
                <MobileTopBar />
                <Header />
                <main className="app-main">{children}</main>
            </div>

            <BottomTabBar />
        </div>
    );
}
