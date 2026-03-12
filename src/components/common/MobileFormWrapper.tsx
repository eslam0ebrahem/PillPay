'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Drawer, Grid } from 'antd';

const { useBreakpoint } = Grid;

interface MobileFormWrapperProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    destroyOnHidden?: boolean;
    width?: number | string;
}

export default function MobileFormWrapper({
    open,
    onClose,
    title,
    children,
    footer,
    destroyOnHidden = false,
    width = 600
}: MobileFormWrapperProps) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Return null during SSR to prevent hydration mismatch
    if (!mounted) {
        return null;
    }

    const isMobile = screens.xs || (screens.sm && !screens.md);

    // --- Desktop Layout (Centered Modal) ---
    if (!isMobile) {
        return (
            <Modal
                title={title}
                open={open}
                onCancel={onClose}
                footer={footer === undefined ? null : footer}
                destroyOnHidden={destroyOnHidden}
                width={width}
                centered // Centered modals feel much more premium on desktop monitors
                forceRender
            >
                {children}
            </Modal>
        );
    }

    // --- Mobile Layout (Native-Style Bottom Sheet) ---
    return (
        <Drawer
            title={title}
            placement="bottom"
            open={open}
            onClose={onClose}
            destroyOnHidden={destroyOnHidden}
            footer={footer === undefined ? null : footer}
            height="auto" // Wraps tight to small forms...
            style={{ maxHeight: '92dvh' }} // ...but never exceeds 92% of the screen height for large forms
            styles={{
                content: {
                    borderTopLeftRadius: 20, // Native rounded top corners
                    borderTopRightRadius: 20,
                },
                header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '16px 20px',
                    textAlign: 'center', // Centers the title for a native feel
                },
                body: {
                    padding: '20px',
                    overflowY: 'auto',
                },
                footer: {
                    // Safe area inset ensures the footer isn't blocked by the iPhone home indicator
                    padding: '12px 20px calc(12px + env(safe-area-inset-bottom, 0px))',
                    borderTop: '1px solid #f0f0f0',
                    background: '#fff',
                }
            }}
            forceRender
        >
            {/* Visual Drag Handle (Affordance) */}
            <div style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 36,
                height: 5,
                backgroundColor: '#e6e6e6',
                borderRadius: 3,
                zIndex: 10
            }} />
            
            {children}
        </Drawer>
    );
}