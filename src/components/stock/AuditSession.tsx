'use client';

import { useEffect, useState } from 'react';
import {
    Button,
    Card,
    Col,
    Empty,
    InputNumber,
    Row,
    Space,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import { CheckCircleOutlined, PlayCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface SessionListItem {
    _id: string;
    status: 'in_progress' | 'completed';
    startedAt: string;
    completedAt?: string | null;
    startedBy?: { name?: string } | null;
}

interface SessionCount {
    productId: { _id: string; nameAr: string; baseUnit?: string } | string;
    location: 'warehouse' | 'floor';
    expectedQty: number;
    actualQty: number;
    discrepancy: number;
    adjusted: boolean;
}

interface SessionDetail {
    _id: string;
    status: 'in_progress' | 'completed';
    startedAt: string;
    completedAt?: string | null;
    counts: SessionCount[];
}

export default function AuditSession() {
    const queryClient = useQueryClient();
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [counts, setCounts] = useState<SessionCount[]>([]);

    const sessionsQuery = useQuery({
        queryKey: ['inventory-audit-sessions'],
        queryFn: async () => {
            const response = await fetch('/api/inventory-audits');
            if (!response.ok) {
                throw new Error('تعذر تحميل جلسات الجرد');
            }

            const payload = await response.json();
            return payload.data as SessionListItem[];
        },
    });

    useEffect(() => {
        if (!selectedSessionId && sessionsQuery.data && sessionsQuery.data.length > 0) {
            const inProgress = sessionsQuery.data.find((session) => session.status === 'in_progress');
            setSelectedSessionId(inProgress?._id ?? sessionsQuery.data[0]._id);
        }
    }, [selectedSessionId, sessionsQuery.data]);

    const sessionQuery = useQuery({
        queryKey: ['inventory-audit-session', selectedSessionId],
        enabled: !!selectedSessionId,
        queryFn: async () => {
            const response = await fetch(`/api/inventory-audits/${selectedSessionId}`);
            if (!response.ok) {
                throw new Error('تعذر تحميل تفاصيل الجرد');
            }

            const payload = await response.json();
            return payload.data as SessionDetail;
        },
    });

    useEffect(() => {
        if (sessionQuery.data) {
            setCounts(sessionQuery.data.counts);
        }
    }, [sessionQuery.data]);

    const startMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/inventory-audits', { method: 'POST' });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.error?.message || 'تعذر بدء الجرد');
            }

            return payload.data as SessionListItem;
        },
        onSuccess: (session) => {
            message.success('تم بدء جلسة جرد جديدة');
            queryClient.invalidateQueries({ queryKey: ['inventory-audit-sessions'] });
            setSelectedSessionId(session._id);
        },
        onError: (error: Error) => {
            message.error(error.message);
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedSessionId) {
                throw new Error('اختر جلسة جرد أولاً');
            }

            const response = await fetch(`/api/inventory-audits/${selectedSessionId}/counts`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    counts: counts.map((count) => ({
                        productId:
                            typeof count.productId === 'string'
                                ? count.productId
                                : count.productId._id,
                        location: count.location,
                        actualQty: count.actualQty,
                    })),
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error?.message || 'تعذر حفظ العد');
            }

            return payload.data as SessionDetail;
        },
        onSuccess: (session) => {
            message.success('تم حفظ العد');
            queryClient.invalidateQueries({ queryKey: ['inventory-audit-session', selectedSessionId] });
            if (session) {
                setCounts(session.counts);
            }
        },
        onError: (error: Error) => {
            message.error(error.message);
        },
    });

    const approveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedSessionId) {
                throw new Error('اختر جلسة جرد أولاً');
            }

            const response = await fetch(`/api/inventory-audits/${selectedSessionId}/approve`, {
                method: 'POST',
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.error?.message || 'تعذر اعتماد الجرد');
            }

            return payload.data as SessionDetail;
        },
        onSuccess: () => {
            message.success('تم اعتماد الجرد وتحديث المخزون');
            queryClient.invalidateQueries({ queryKey: ['inventory-audit-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-audit-session', selectedSessionId] });
        },
        onError: (error: Error) => {
            message.error(error.message);
        },
    });

    const selectedSession = sessionQuery.data;

    return (
        <Row gutter={[16, 16]}>
            <Col xs={24} xl={7}>
                <Card
                    title="جلسات الجرد"
                    extra={
                        <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            loading={startMutation.isPending}
                            onClick={() => void startMutation.mutateAsync()}
                        >
                            بدء جلسة
                        </Button>
                    }
                >
                    <Table
                        size="small"
                        loading={sessionsQuery.isLoading}
                        dataSource={sessionsQuery.data ?? []}
                        rowKey="_id"
                        pagination={false}
                        locale={{ emptyText: <Empty description="لا توجد جلسات جرد" /> }}
                        onRow={(record) => ({
                            onClick: () => setSelectedSessionId(record._id),
                            style: {
                                cursor: 'pointer',
                                background:
                                    record._id === selectedSessionId ? '#f0f8ff' : undefined,
                            },
                        })}
                        columns={[
                            {
                                title: 'التاريخ',
                                key: 'startedAt',
                                render: (_value, record: SessionListItem) =>
                                    dayjs(record.startedAt).format('YYYY-MM-DD HH:mm'),
                            },
                            {
                                title: 'الحالة',
                                key: 'status',
                                render: (_value, record: SessionListItem) => (
                                    <Tag color={record.status === 'completed' ? 'green' : 'blue'}>
                                        {record.status === 'completed' ? 'مكتمل' : 'جاري'}
                                    </Tag>
                                ),
                            },
                        ]}
                    />
                </Card>
            </Col>

            <Col xs={24} xl={17}>
                <Card>
                    {selectedSession ? (
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <div>
                                <Title level={4} style={{ marginBottom: 8 }}>
                                    جلسة الجرد
                                </Title>
                                <Space wrap>
                                    <Text type="secondary">
                                        بدأت في {dayjs(selectedSession.startedAt).format('YYYY-MM-DD HH:mm')}
                                    </Text>
                                    <Tag color={selectedSession.status === 'completed' ? 'green' : 'blue'}>
                                        {selectedSession.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
                                    </Tag>
                                </Space>
                            </div>

                            <Space>
                                <Button
                                    icon={<SaveOutlined />}
                                    type="default"
                                    loading={saveMutation.isPending}
                                    disabled={selectedSession.status === 'completed'}
                                    onClick={() => void saveMutation.mutateAsync()}
                                >
                                    حفظ العد
                                </Button>
                                <Button
                                    icon={<CheckCircleOutlined />}
                                    type="primary"
                                    danger
                                    loading={approveMutation.isPending}
                                    disabled={selectedSession.status === 'completed'}
                                    onClick={() => void approveMutation.mutateAsync()}
                                >
                                    اعتماد التعديلات
                                </Button>
                            </Space>

                            <Table
                                loading={sessionQuery.isLoading}
                                dataSource={counts}
                                rowKey={(record) =>
                                    `${typeof record.productId === 'string' ? record.productId : record.productId._id}-${record.location}`
                                }
                                pagination={{ pageSize: 25 }}
                                scroll={{ x: 'max-content' }}
                                columns={[
                                    {
                                        title: 'المنتج',
                                        key: 'product',
                                        render: (_value, record: SessionCount) =>
                                            typeof record.productId === 'string'
                                                ? record.productId
                                                : record.productId.nameAr,
                                    },
                                    {
                                        title: 'الموقع',
                                        key: 'location',
                                        render: (_value, record: SessionCount) =>
                                            record.location === 'warehouse' ? 'المخزن' : 'الرف',
                                    },
                                    {
                                        title: 'المتوقع',
                                        dataIndex: 'expectedQty',
                                        key: 'expectedQty',
                                    },
                                    {
                                        title: 'الفعلي',
                                        key: 'actualQty',
                                        render: (_value, record: SessionCount, index: number) => (
                                            <InputNumber
                                                min={0}
                                                value={record.actualQty}
                                                disabled={selectedSession.status === 'completed'}
                                                onChange={(value) =>
                                                    setCounts((current) =>
                                                        current.map((count, currentIndex) =>
                                                            currentIndex === index
                                                                ? {
                                                                      ...count,
                                                                      actualQty: Number(value ?? 0),
                                                                      discrepancy:
                                                                          Number(value ?? 0) -
                                                                          count.expectedQty,
                                                                  }
                                                                : count
                                                        )
                                                    )
                                                }
                                            />
                                        ),
                                    },
                                    {
                                        title: 'الفارق',
                                        key: 'discrepancy',
                                        render: (_value, record: SessionCount) => (
                                            <Tag
                                                color={
                                                    record.discrepancy === 0
                                                        ? 'green'
                                                        : record.discrepancy > 0
                                                          ? 'gold'
                                                          : 'red'
                                                }
                                            >
                                                {record.discrepancy}
                                            </Tag>
                                        ),
                                    },
                                    {
                                        title: 'الحالة',
                                        key: 'adjusted',
                                        render: (_value, record: SessionCount) =>
                                            record.adjusted ? (
                                                <Tag color="green">تمت المعالجة</Tag>
                                            ) : (
                                                <Tag color="blue">بانتظار الاعتماد</Tag>
                                            ),
                                    },
                                ]}
                            />
                        </Space>
                    ) : (
                        <Empty description="اختر جلسة جرد أو ابدأ جلسة جديدة" />
                    )}
                </Card>
            </Col>
        </Row>
    );
}
