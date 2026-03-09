'use client';

import { Typography } from 'antd';

const { Title } = Typography;

interface PageHeaderProps {
    title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
    return (
        <Title level={2} style={{ marginBottom: 24 }}>
            {title}
        </Title>
    );
}
