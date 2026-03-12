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
    loading = false,
    tableColumns,
    renderCard,
    pagination,
    rowKey,
    tableProps
}: ResponsiveDataViewProps<T>) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = React.useState(false);
    const [internalCurrent, setInternalCurrent] = React.useState(1);
    
    // Pagination derived state
    const isControlled = pagination && typeof (pagination as any).current !== 'undefined';
    const actualCurrent = isControlled ? (pagination as any).current : internalCurrent;
    const pageSize = (pagination as any)?.pageSize || (pagination as any)?.defaultPageSize || 10;
    const actualTotal = (pagination as any)?.total || data.length;

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // On server and first client pass, we default to desktop view (Table)
    // because screens.md is undefined on server, and undefined !== false is true.
    const isDesktop = !mounted || screens.md !== false;

    if (isDesktop) {
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

    const handlePageChange = (page: number, size: number) => {
        if (!isControlled) {
            setInternalCurrent(page);
        }
        if ((pagination as any)?.onChange) {
            (pagination as any).onChange(page, size);
        } else if (tableProps?.onChange) {
            tableProps.onChange({ ...(pagination as object), current: page, pageSize: size }, {}, {}, { action: 'paginate', currentDataSource: [] });
        }
    };

    // Mobile View - Sync with Table client/server side logic
    const shouldSlice = data.length > pageSize && !isControlled;
    const paginatedData = shouldSlice && pagination 
        ? data.slice((actualCurrent - 1) * pageSize, actualCurrent * pageSize) 
        : data;

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
                        {pagination && actualTotal > pageSize && (
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                                <Pagination
                                    current={actualCurrent}
                                    pageSize={pageSize}
                                    total={actualTotal}
                                    onChange={handlePageChange}
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
