'use client';

import React from 'react';
import { Card, Typography, Divider, Flex } from 'antd';

const { Text } = Typography;

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
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)', // Slightly softer shadow for modern mobile feel
                marginBottom: 12,
                overflow: 'hidden',
                border: '1px solid #f0f0f0'
            }}
            styles={{
                body: { padding: 16 }
            }}
        >
            {/* Header Section */}
            <Flex 
                justify="space-between" 
                align="flex-start" 
                gap={12} 
                style={{ marginBottom: properties && properties.length > 0 ? 12 : 0 }}
            >
                {/* minWidth: 0 is CRITICAL here so long text truncates instead of breaking the flex container */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                        fontSize: 16, 
                        fontWeight: 600, 
                        color: '#1f1f1f',
                        wordBreak: 'break-word' // Safely wrap extremely long product names/barcodes
                    }}>
                        {title}
                    </div>
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
            </Flex>

            {/* Properties Grid Section */}
            {properties && properties.length > 0 && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', // Strict 2-column layout
                    gap: '12px 8px',
                    paddingTop: 12,
                    borderTop: '1px dashed #f0f0f0' // Dashed looks cleaner for data separation
                }}>
                    {properties.map((prop, index) => (
                        <div 
                            key={index} 
                            style={{ 
                                gridColumn: prop.fullWidth ? '1 / -1' : 'auto',
                                minWidth: 0 // Prevent grid blowout
                            }}
                        >
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                {prop.label}
                            </Text>
                            <div style={{ fontSize: 14, fontWeight: 500, wordBreak: 'break-word' }}>
                                {prop.value}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions Section */}
            {actions && (
                <>
                    <Divider style={{ margin: '16px 0 12px 0' }} />
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        gap: 8,
                        flexWrap: 'wrap',
                        width: '100%'
                    }}>
                        {actions}
                    </div>
                </>
            )}
        </Card>
    );
}

export default DataCard;