'use client';

import React from 'react';
import { Card, Typography, Divider } from 'antd';

const { Text, Title } = Typography;

export interface DataCardProperty {
    label: React.ReactNode;
    value: React.ReactNode;
    fullWidth?: boolean;
}

export interface DataCardProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    badge?: React.ReactNode;
    properties?: DataCardProperty[];
    actions?: React.ReactNode;
    onClick?: () => void;
}

export function DataCard({ title, subtitle, badge, properties, actions, onClick }: DataCardProps) {
    return (
        <Card
            hoverable={!!onClick}
            onClick={onClick}
            style={{ 
                borderRadius: 12, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', 
                marginBottom: 12,
                overflow: 'hidden'
            }}
            styles={{
                body: { padding: 16 }
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: properties && properties.length > 0 ? 12 : 0 }}>
                <div style={{ flex: 1, marginRight: badge ? 12 : 0 }}>
                    <Title level={5} style={{ margin: 0, fontSize: 16 }}>
                        {title}
                    </Title>
                    {subtitle && (
                        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
                            {subtitle}
                        </Text>
                    )}
                </div>
                {badge && (
                    <div style={{ flexShrink: 0 }}>
                        {badge}
                    </div>
                )}
            </div>

            {properties && properties.length > 0 && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '12px 8px',
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid #f0f0f0'
                }}>
                    {properties.map((prop, index) => (
                        <div key={index} style={{ gridColumn: prop.fullWidth ? '1 / -1' : 'auto' }}>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
                                {prop.label}
                            </Text>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>
                                {prop.value}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {actions && (
                <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        gap: 8,
                        flexWrap: 'wrap'
                    }}>
                        {actions}
                    </div>
                </>
            )}
        </Card>
    );
}

export default DataCard;
