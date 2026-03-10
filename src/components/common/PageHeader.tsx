'use client';

import { Typography, Grid, Space } from 'antd';
import React from 'react';

const { Title } = Typography;
const { useBreakpoint } = Grid;

interface PageHeaderProps {
    title: string;
    extra?: React.ReactNode;
}

export default function PageHeader({ title, extra }: PageHeaderProps) {
    const screens = useBreakpoint();

    if (!screens.md) {
        // On mobile, the title is already in the MobileTopBar
        // But we might still want to show the 'extra' actions if they exist
        if (extra) {
            return (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    {extra}
                </div>
            );
        }
        return null;
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Title level={2} style={{ margin: 0 }}>
                {title}
            </Title>
            {extra && (
                <Space>
                    {extra}
                </Space>
            )}
        </div>
    );
}
