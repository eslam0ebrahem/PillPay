'use client';

import React from 'react';
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
    destroyOnHidden = true,
    width = 600
}: MobileFormWrapperProps) {
    const screens = useBreakpoint();

    if (screens.md !== false) {
        return (
            <Modal
                title={title}
                open={open}
                onCancel={onClose}
                footer={footer}
                destroyOnHidden={destroyOnHidden}
                width={width}
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
            footer={footer}
        >
            {children}
        </Drawer>
    );
}

export default MobileFormWrapper;
