'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Table, Grid, Empty, Spin, Pagination, Flex, Typography } from 'antd';
import type { TableProps, TablePaginationConfig } from 'antd';

const { useBreakpoint } = Grid;
const { Text } = Typography;

export interface ResponsiveDataViewProps<T> {
    data: T[];
    loading?: boolean;
    tableColumns: NonNullable<TableProps<T>['columns']>;
    renderCard: (item: T, index: number) => React.ReactNode;
    pagination?: TablePaginationConfig | false;
    rowKey: string | ((item: T) => string);
    tableProps?: Omit<TableProps<T>, 'dataSource' | 'columns' | 'loading' | 'pagination' | 'rowKey'>;
    emptyText?: React.ReactNode;
}

export function ResponsiveDataView<T extends Record<string, any>>({
    data,
    loading = false,
    tableColumns,
    renderCard,
    pagination,
    rowKey,
    tableProps,
    emptyText = 'لا توجد بيانات'
}: ResponsiveDataViewProps<T>) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    const [internalCurrent, setInternalCurrent] = useState(1);

    // Prevent hydration mismatch between Server Render (where breakpoints don't exist) and Client
    useEffect(() => {
        setMounted(true);
    }, []);

    // Strict mobile definition
    const isMobile = mounted && (screens.xs || (screens.sm && !screens.md));

    // --- Pagination Logic ---
    const isControlled = pagination && pagination.current !== undefined;
    const current = isControlled ? pagination.current! : internalCurrent;
    const pageSize = (pagination && pagination.pageSize) || 10;
    const total = (pagination && pagination.total) || data.length;

    const handlePageChange = (page: number, size: number) => {
        if (!isControlled) {
            setInternalCurrent(page);
        }
        
        // Ensure parent handlers are correctly fired even when in mobile Card mode
        if (pagination && pagination.onChange) {
            pagination.onChange(page, size);
        } else if (tableProps?.onChange) {
            // Safely mock the Ant Design Table onChange signature so parent components don't crash
            tableProps.onChange(
                { ...(pagination as TablePaginationConfig), current: page, pageSize: size },
                {},
                {},
                { action: 'paginate', currentDataSource: data }
            );
        }
    };

    // Calculate which data to show on mobile if pagination is handled client-side
    const displayedData = useMemo(() => {
        if (pagination !== false && !isControlled && data.length > pageSize) {
            const startIndex = (current - 1) * pageSize;
            return data.slice(startIndex, startIndex + pageSize);
        }
        return data; // Server-side pagination means the data is already sliced
    }, [data, pagination, isControlled, current, pageSize]);

    // --- Renders ---

    // 1. SSR / Unmounted State
    if (!mounted) {
        return <Table columns={tableColumns} dataSource={[]} loading={true} rowKey={rowKey as any} />;
    }

    // 2. Desktop Layout (Standard Table)
    if (!isMobile) {
        return (
            <Table
                dataSource={data}
                columns={tableColumns}
                loading={loading}
                pagination={pagination}
                rowKey={rowKey as any}
                {...tableProps}
            />
        );
    }

    // 3. Mobile Layout (Card List)
    return (
        <Spin spinning={loading}>
            <div style={{ width: '100%' }}>
                {displayedData.length > 0 ? (
                    <Flex vertical gap={12}>
                        {displayedData.map((item, index) => {
                            const key = typeof rowKey === 'function' ? rowKey(item) : item[rowKey as keyof T] || index;
                            return (
                                <div key={key as React.Key}>
                                    {renderCard(item, index)}
                                </div>
                            );
                        })}

                        {/* Mobile Pagination */}
                        {pagination !== false && total > pageSize && (
                            <Flex justify="center" style={{ padding: '16px 0' }}>
                                <Pagination
                                    current={current}
                                    pageSize={pageSize}
                                    total={total}
                                    onChange={handlePageChange}
                                    size="small"
                                    showSizeChanger={false} // Hides the "10 / page" dropdown to save horizontal space
                                    showLessItems={true} // Shows fewer page numbers so it doesn't wrap on small phones
                                />
                            </Flex>
                        )}
                    </Flex>
                ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<Text type="secondary">{emptyText}</Text>}
                        style={{ margin: '40px 0' }}
                    />
                )}
            </div>
        </Spin>
    );
}

export default ResponsiveDataView;