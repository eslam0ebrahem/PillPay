'use client';

import { Typography, Grid, Flex } from 'antd';
import React, { useState, useEffect } from 'react';

const { Title } = Typography;
const { useBreakpoint } = Grid;

interface PageHeaderProps {
    title: string;
    extra?: React.ReactNode;
}

export default function PageHeader({ title, extra }: PageHeaderProps) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    // Prevent Next.js hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    // Render a hidden placeholder during server-side rendering to maintain layout height
    if (!mounted) {
        return (
            <Flex justify="space-between" align="center" style={{ marginBottom: 24, visibility: 'hidden' }}>
                <Title level={2} style={{ margin: 0 }}>{title}</Title>
            </Flex>
        );
    }

    const isMobile = screens.xs || (screens.sm && !screens.md);

    if (isMobile) {
        // On mobile, the title is already in the MobileTopBar.
        // We just render the 'extra' actions to be full-width and touch-friendly.
        if (extra) {
            return (
                <div style={{ marginBottom: 16, width: '100%' }}>
                    {extra}
                </div>
            );
        }
        return null;
    }

    // Desktop Layout
    return (
        <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
            <Title level={2} style={{ margin: 0, color: '#1f1f1f' }}>
                {title}
            </Title>
            {extra && (
                <Flex gap={12} align="center">
                    {extra}
                </Flex>
            )}
        </Flex>
    );
}