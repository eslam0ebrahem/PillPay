'use client';

import React from 'react';
import { Table, Grid, Empty, Spin, Pagination } from 'antd';
import type { TableProps } from 'antd';

const { useBreakpoint } = Grid;

interface ResponsiveDataViewProps<T> {
    data: T[];
    loading?: boolean;
    tableColumns: TableProps<T>['columns'];
    renderCard: (item: T) => React.ReactNode;
    pagination?: TableProps<T>['pagination'];
    rowKey: string | ((item: T) => string);
    tableProps?: Omit<TableProps<T>, 'dataSource' | 'columns' | 'loading' | 'pagination' | 'rowKey'>;
}

export function ResponsiveDataView<T>({
    data,
    loading,
    tableColumns,
    renderCard,
    pagination,
    rowKey,
    tableProps
}: ResponsiveDataViewProps<T>) {
    const screens = useBreakpoint();
    const [currentPage, setCurrentPage] = React.useState(1);
    const pageSize = (pagination as any)?.pageSize || (pagination as any)?.defaultPageSize || 10;

    if (screens.md !== false) {
        return (
            <Table
                dataSource={data}
                columns={tableColumns}
                loading={loading}
                pagination={pagination}
                rowKey={rowKey}
                {...tableProps}
            />
        );
    }

    // Mobile View - Refactored to avoid deprecated List component
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = pagination ? data.slice(startIndex, startIndex + pageSize) : data;

    return (
        <Spin spinning={loading}>
            <div style={{ width: '100%' }}>
                {data.length > 0 ? (
                    <>
                        {paginatedData.map((item, index) => (
                            <div
                                key={typeof rowKey === 'function' ? rowKey(item) : (item as any)[rowKey] || index}
                                style={{ padding: '0 0 12px 0' }}
                            >
                                {renderCard(item)}
                            </div>
                        ))}
                        {pagination && data.length > pageSize && (
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                                <Pagination
                                    current={currentPage}
                                    pageSize={pageSize}
                                    total={data.length}
                                    onChange={(page) => setCurrentPage(page)}
                                    size="small"
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="لا توجد بيانات"
                        style={{ margin: '40px 0' }}
                    />
                )}
            </div>
        </Spin>
    );
}

export default ResponsiveDataView;
