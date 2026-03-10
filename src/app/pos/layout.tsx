'use client';

import { ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';

export default function POSLayout({ children }: { children: ReactNode }) {
    return (
        <AppShell>
            {children}
        </AppShell>
    );
}
