'use client';

import { DatePicker, Segmented, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

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
    return (
        <Space wrap size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space wrap>
                <Text strong>الفترة</Text>
                <Segmented
                    value={value.period}
                    options={[
                        { label: 'اليوم', value: 'today' },
                        { label: 'أمس', value: 'yesterday' },
                        { label: 'هذا الأسبوع', value: 'this_week' },
                        { label: 'هذا الشهر', value: 'this_month' },
                        { label: 'مخصص', value: 'custom' },
                    ]}
                    onChange={(period) =>
                        onChange({
                            ...value,
                            period: period as ReportFilterPeriod,
                        })
                    }
                />

                {value.period === 'custom' ? (
                    <DatePicker.RangePicker
                        allowClear={false}
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
                ) : null}
            </Space>

            <Space wrap>
                <Text strong>المقارنة</Text>
                <Select
                    allowClear
                    value={value.compare ?? undefined}
                    placeholder="بدون مقارنة"
                    style={{ minWidth: 180 }}
                    onChange={(compare) =>
                        onChange({
                            ...value,
                            compare: (compare as ReportFilterCompare | undefined) ?? null,
                        })
                    }
                    options={[
                        { label: 'الفترة السابقة', value: 'mom' },
                        { label: 'نفس الفترة العام الماضي', value: 'yoy' },
                    ]}
                />
            </Space>
        </Space>
    );
}
