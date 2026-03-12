'use client';

import { ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';

/**
 * POSLayout wraps the Point of Sale system.
 * * We use the standard AppShell to maintain navigation consistency,
 * but the children (POSScreen) will handle their own internal 
 * layout to provide a "Full Screen" experience.
 */
export default function POSLayout({ children }: { children: ReactNode }) {
    return (
        <AppShell>
            <div style={{ 
                height: '100%', 
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                // Ensures the POS doesn't get hidden behind the 
                // fixed MobileBottomBar on smaller screens
                paddingBottom: 'env(safe-area-inset-bottom)' 
            }}>
                {children}
            </div>
        </AppShell>
    );
}