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
            // 1. Native Mobile Frosted Glass Effect
            backgroundColor: 'rgba(255, 255, 255, 0.85)', 
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)', // Safari support
            
            borderTop: '1px solid #f0f0f0',
            padding: '12px 16px',
            // Safe area inset is critical for phones with gesture bars
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            zIndex: 1000,
            // 2. Softer, more elevated shadow
            boxShadow: '0 -4px 16px rgba(0,0,0,0.06)', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%'
        }}>
            {/* 3. Inner Wrapper to control stretch and max-width */}
            <div style={{ 
                display: 'flex', 
                gap: '12px', 
                width: '100%', 
                maxWidth: 600, // Prevents buttons from becoming comically wide on iPads/Tablets
                margin: '0 auto',
                justifyContent: 'stretch'
            }}>
                {/* This little map ensures that if you pass multiple buttons 
                    (e.g., "Cancel" and "Save"), they automatically share the width equally. 
                */}
                {React.Children.map(children, (child) => (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '100%' }}>
                            {child}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default StickySubmitBar;