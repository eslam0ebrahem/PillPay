'use client';

import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-shell">
            <Sidebar />
            <div className="app-content">
                <Header />
                <main className="app-main">{children}</main>
            </div>
        </div>
    );
}
