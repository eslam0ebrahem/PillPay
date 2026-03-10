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
    width?: number;
}

export function MobileFormWrapper({
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

    // Return null or a consistent placeholder during SSR and first client pass
    if (!mounted) {
        return null;
    }

    const isDesktop = screens.md !== false;

    if (isDesktop) {
        return (
            <Modal
                title={title}
                open={open}
                onCancel={onClose}
                footer={footer === undefined ? null : footer}
                destroyOnHidden={destroyOnHidden}
                width={width}
                forceRender
            >
                {children}
            </Modal>
        );
    }

    return (
        <Drawer
            title={title}
            placement="bottom"
            size="large"
            open={open}
            onClose={onClose}
            destroyOnHidden={destroyOnHidden}
            footer={footer === undefined ? null : footer}
            forceRender
        >
            {children}
        </Drawer>
    );
}

export default MobileFormWrapper;
