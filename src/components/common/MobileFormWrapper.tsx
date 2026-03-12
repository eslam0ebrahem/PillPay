'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Drawer, Grid } from 'antd';

const { useBreakpoint } = Grid;

interface MobileFormWrapperProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    destroyOnHidden?: boolean;
    forceRender?: boolean;
    maskClosable?: boolean;
    width?: number | string;
    afterOpenChange?: (isOpen: boolean) => void;
}

// Defined outside the component so the object reference is stable across renders
const DRAWER_STYLES: React.ComponentProps<typeof Drawer>['styles'] = {
    section: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    header: {
        borderBottom: '1px solid #f0f0f0',
        padding: '20px 20px 16px', // Extra top padding to accommodate the drag handle above the title
        textAlign: 'center',
    },
    body: {
        padding: '20px',
        overflowY: 'auto',
    },
    footer: {
        // Safe-area inset ensures the footer isn't blocked by the iPhone home indicator
        padding: 'calc(12px + env(safe-area-inset-bottom, 0px)) 20px 12px',
        borderTop: '1px solid #f0f0f0',
        background: '#fff',
    },
};

// Drag handle rendered as part of the drawer title so it sits above the title text,
// not floating over the body content
function DrawerTitle({ title }: { title: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div
                aria-hidden="true"
                style={{
                    width: 36,
                    height: 5,
                    backgroundColor: '#e0e0e0',
                    borderRadius: 3,
                }}
            />
            <span>{title}</span>
        </div>
    );
}

export default function MobileFormWrapper({
    open,
    onClose,
    title,
    children,
    footer,
    destroyOnHidden = false,
    forceRender = false,
    maskClosable = true,
    width = 600,
    afterOpenChange,
}: MobileFormWrapperProps) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = useMemo(
        () => mounted && (screens.xs || (screens.sm && !screens.md)),
        [mounted, screens.xs, screens.sm, screens.md]
    );

    // Normalize footer once — avoids repeating the ternary in both branches
    const normalizedFooter = footer === undefined ? null : footer;

    // Prevent hydration mismatch — return null during SSR
    if (!mounted) return null;

    // --- Desktop Layout (Centered Modal) ---
    if (!isMobile) {
        return (
            <Modal
                title={title}
                open={open}
                onCancel={onClose}
                footer={normalizedFooter}
                destroyOnHidden={destroyOnHidden}
                forceRender={forceRender}
                mask={maskClosable}
                afterOpenChange={afterOpenChange}
                width={width}
                centered
            >
                {children}
            </Modal>
        );
    }

    // --- Mobile Layout (Native-Style Bottom Sheet) ---
    return (
        <Drawer
            title={<DrawerTitle title={title} />}
            placement="bottom"
            open={open}
            zIndex={1001}
            onClose={onClose}
            destroyOnHidden={destroyOnHidden}
            forceRender={forceRender}
            mask={maskClosable}
            afterOpenChange={afterOpenChange}
            footer={normalizedFooter}
            size="auto"
            style={{ maxHeight: '92dvh' }}
            styles={DRAWER_STYLES}
        >
            {children}
        </Drawer>
    );
}
