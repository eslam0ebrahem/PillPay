'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Grid, Layout, Drawer, ConfigProvider } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileTopBar from './MobileTopBar';
import BottomTabBar from './BottomTabBar';

const { Content, Sider } = Layout;
const { useBreakpoint } = Grid;

export default function AppShell({ children }: { children: React.ReactNode }) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // SSR safe responsive logic
    const isDesktop = mounted && (screens.md !== false);
    const isMobile = mounted && !isDesktop;

    return (
        <ConfigProvider direction="rtl">
            <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
                {/* 1. Desktop Sidebar */}
                {isDesktop && (
                    <Sider
                        collapsible
                        collapsed={collapsed}
                        onCollapse={(value) => setCollapsed(value)}
                        width={260}
                        theme="dark"
                        style={{
                            overflow: 'auto',
                            height: '100vh',
                            position: 'sticky',
                            top: 0,
                            left: 0,
                            boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
                            zIndex: 1001
                        }}
                    >
                        <Sidebar collapsed={collapsed} />
                    </Sider>
                )}

                {/* 2. Mobile Drawer Sidebar (Triggered from TopBar or "More" tab) */}
                {isMobile && (
                    <Drawer
                        placement="right"
                        onClose={() => setMobileMenuOpen(false)}
                        open={mobileMenuOpen}
                        styles={{ body: { padding: 0 } }}
                        size={280}
                        closable={false}
                    >
                        <Sidebar isMobile onClose={() => setMobileMenuOpen(false)} />
                    </Drawer>
                )}

                <Layout>
                    {/* 3. Headers */}
                    <MobileTopBar 
                        // You can pass a menu toggle or specific page actions here
                        rightAction={isMobile ? undefined : null} 
                    />
                    <Header />

                    {/* 4. Main Content Area */}
                    <Content style={{
                        padding: isMobile ? '16px 0 80px 0' : '24px 32px',
                        minHeight: 280,
                        maxWidth: isMobile ? '100%' : 1600,
                        margin: '0 auto',
                        width: '100%',
                        transition: 'all 0.2s'
                    }}>
                        <main className="app-main">
                            {children}
                        </main>
                    </Content>

                    {/* 5. Mobile Bottom Navigation */}
                    {isMobile && <BottomTabBar />}
                </Layout>
            </Layout>
        </ConfigProvider>
    );
}