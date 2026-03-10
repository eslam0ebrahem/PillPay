'use client';

import React from 'react';

interface StickySubmitBarProps {
    children: React.ReactNode;
}

export function StickySubmitBar({ children }: StickySubmitBarProps) {
    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'white',
            borderTop: '1px solid var(--border, #d9d9d9)',
            padding: '16px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            zIndex: 1000,
            boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
        }}>
            {children}
        </div>
    );
}

export default StickySubmitBar;
