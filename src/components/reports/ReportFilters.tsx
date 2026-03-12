'use client';

import { useState, useEffect } from 'react';
import { DatePicker, Segmented, Select, Typography, Card, Grid, Flex } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;
const { useBreakpoint } = Grid;

export type ReportFilterPeriod = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
export type ReportFilterCompare = 'mom' | 'yoy' | null;

export interface ReportFilterValue {
    period: ReportFilterPeriod;
    compare: ReportFilterCompare;
    from: string | null;
    to: string | null;
}

interface ReportFiltersProps {
    value: ReportFilterValue;
    onChange: (nextValue: ReportFilterValue) => void;
}

export default function ReportFilters({ value, onChange }: ReportFiltersProps) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent hydration mismatch
    if (!mounted) return null;

    const isMobile = screens.xs || (screens.sm && !screens.md);

    const periodOptions = [
        { label: 'اليوم', value: 'today' },
        { label: 'أمس', value: 'yesterday' },
        { label: 'هذا الأسبوع', value: 'this_week' },
        { label: 'هذا الشهر', value: 'this_month' },
        { label: 'مخصص', value: 'custom' },
    ];

    return (
        <Card 
            size="small" 
            variant="borderless"
            style={{ 
                marginBottom: 24, 
                borderRadius: 12, 
                backgroundColor: '#fafafa',
                border: '1px solid #f0f0f0'
            }}
        >
            <Flex 
                vertical={isMobile} 
                justify="space-between" 
                align={isMobile ? 'stretch' : 'center'} 
                gap={16}
            >
                {/* --- Left Side: Period Selection --- */}
                <Flex vertical={isMobile} gap={12} align={isMobile ? 'stretch' : 'center'}>
                    <Text strong style={{ minWidth: 50 }}>الفترة:</Text>
                    
                    {/* Dynamic Element: Select for Mobile, Segmented for Desktop */}
                    {isMobile ? (
                        <Select
                            size="large"
                            value={value.period}
                            options={periodOptions}
                            onChange={(period) => onChange({ ...value, period: period as ReportFilterPeriod })}
                            style={{ width: '100%' }}
                        />
                    ) : (
                        <Segmented
                            value={value.period}
                            options={periodOptions}
                            onChange={(period) => onChange({ ...value, period: period as ReportFilterPeriod })}
                        />
                    )}

                    {/* Custom Date Range Picker */}
                    {value.period === 'custom' && (
                        <DatePicker.RangePicker
                            size={isMobile ? "large" : "middle"}
                            allowClear={false}
                            style={{ width: isMobile ? '100%' : 260 }}
                            value={[
                                value.from ? dayjs(value.from) : dayjs(),
                                value.to ? dayjs(value.to) : dayjs(),
                            ]}
                            onChange={(dates) =>
                                onChange({
                                    ...value,
                                    from: dates?.[0]?.format('YYYY-MM-DD') ?? null,
                                    to: dates?.[1]?.format('YYYY-MM-DD') ?? null,
                                })
                            }
                        />
                    )}
                </Flex>

                {/* --- Right Side: Comparison Selection --- */}
                <Flex vertical={isMobile} gap={12} align={isMobile ? 'stretch' : 'center'}>
                    <Text strong style={{ minWidth: 60 }}>المقارنة:</Text>
                    <Select
                        size={isMobile ? "large" : "middle"}
                        allowClear
                        value={value.compare ?? undefined}
                        placeholder="بدون مقارنة"
                        style={{ minWidth: isMobile ? '100%' : 200 }}
                        onChange={(compare) =>
                            onChange({
                                ...value,
                                compare: (compare as ReportFilterCompare | undefined) ?? null,
                            })
                        }
                        options={[
                            { label: 'الفترة السابقة (MoM)', value: 'mom' },
                            { label: 'نفس الفترة العام الماضي (YoY)', value: 'yoy' },
                        ]}
                    />
                </Flex>
            </Flex>
        </Card>
    );
}