'use client';

import { useEffect, useState, useRef } from 'react';
import {
    Button,
    Card,
    Col,
    Empty,
    InputNumber,
    Row,
    Tag,
    Typography,
    App,
    Grid,
    Flex,
    Divider
} from 'antd';
import { CheckCircleOutlined, PlayCircleOutlined, SaveOutlined, MinusOutlined, PlusOutlined, InboxOutlined, ShopOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import ResponsiveDataView from '../common/ResponsiveDataView';
import { DataCard } from '../common/DataCard';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

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
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [counts, setCounts] = useState<SessionCount[]>([]);
    const detailsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = screens.xs || (screens.sm && !screens.md);

    const sessionsQuery = useQuery({
        queryKey: ['inventory-audit-sessions'],
        queryFn: async () => {
            const response = await fetch('/api/inventory-audits');
            if (!response.ok) throw new Error('تعذر تحميل جلسات الجرد');
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
            if (!response.ok) throw new Error('تعذر تحميل تفاصيل الجرد');
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
            if (!response.ok) throw new Error(payload.error?.message || 'تعذر بدء الجرد');
            return payload.data as SessionListItem;
        },
        onSuccess: (session) => {
            message.success('تم بدء جلسة جرد جديدة');
            queryClient.invalidateQueries({ queryKey: ['inventory-audit-sessions'] });
            setSelectedSessionId(session._id);
            if (isMobile && detailsRef.current) {
                detailsRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        },
        onError: (error: Error) => message.error(error.message),
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedSessionId) throw new Error('اختر جلسة جرد أولاً');
            const response = await fetch(`/api/inventory-audits/${selectedSessionId}/counts`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    counts: counts.map((count) => ({
                        productId: typeof count.productId === 'string' ? count.productId : count.productId._id,
                        location: count.location,
                        actualQty: count.actualQty,
                    })),
                }),
            });

            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error?.message || 'تعذر حفظ العد');
            return payload.data as SessionDetail;
        },
        onSuccess: (session) => {
            message.success('تم حفظ العد بنجاح');
            queryClient.invalidateQueries({ queryKey: ['inventory-audit-session', selectedSessionId] });
            if (session) setCounts(session.counts);
        },
        onError: (error: Error) => message.error(error.message),
    });

    const approveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedSessionId) throw new Error('اختر جلسة جرد أولاً');
            const response = await fetch(`/api/inventory-audits/${selectedSessionId}/approve`, { method: 'POST' });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error?.message || 'تعذر اعتماد الجرد');
            return payload.data as SessionDetail;
        },
        onSuccess: () => {
            message.success('تم اعتماد الجرد وتحديث المخزون بنجاح');
            queryClient.invalidateQueries({ queryKey: ['inventory-audit-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-audit-session', selectedSessionId] });
        },
        onError: (error: Error) => message.error(error.message),
    });

    const selectedSession = sessionQuery.data;

    // Reusable quantity updater
    const handleQtyChange = (index: number, newQty: number, expectedQty: number) => {
        setCounts((current) =>
            current.map((count, i) =>
                i === index
                    ? {
                        ...count,
                        actualQty: Math.max(0, newQty), // Prevent negative inventory
                        discrepancy: Math.max(0, newQty) - expectedQty,
                    }
                    : count
            )
        );
    };

    // --- Desktop Table Columns ---
    const columns = [
        {
            title: 'المنتج',
            key: 'product',
            render: (_value: any, record: SessionCount) => (
                <Text strong>{typeof record.productId === 'string' ? record.productId : record.productId.nameAr}</Text>
            ),
        },
        {
            title: 'الموقع',
            key: 'location',
            render: (_value: any, record: SessionCount) => (
                record.location === 'warehouse' 
                    ? <Tag color="purple" icon={<InboxOutlined />}>المخزن</Tag> 
                    : <Tag color="blue" icon={<ShopOutlined />}>الرف</Tag>
            ),
        },
        {
            title: 'المتوقع',
            dataIndex: 'expectedQty',
            key: 'expectedQty',
            render: (val: number) => <Text type="secondary">{val}</Text>
        },
        {
            title: 'الفعلي',
            key: 'actualQty',
            render: (_value: any, record: SessionCount, index: number) => (
                <InputNumber
                    min={0}
                    size="middle"
                    value={record.actualQty}
                    disabled={selectedSession?.status === 'completed'}
                    onChange={(value) => handleQtyChange(index, Number(value ?? 0), record.expectedQty)}
                    style={{ width: 100, textAlign: 'center' }}
                />
            ),
        },
        {
            title: 'الفارق',
            key: 'discrepancy',
            render: (_value: any, record: SessionCount) => (
                <Tag color={record.discrepancy === 0 ? 'green' : record.discrepancy > 0 ? 'gold' : 'error'}>
                    {record.discrepancy > 0 ? `+${record.discrepancy}` : record.discrepancy}
                </Tag>
            ),
        },
        {
            title: 'الحالة',
            key: 'adjusted',
            render: (_value: any, record: SessionCount) =>
                record.adjusted ? <Tag color="green">تمت المعالجة</Tag> : <Tag color="default">بانتظار الاعتماد</Tag>,
        },
    ];

    // --- Mobile Card Layout ---
    const renderCountCard = (record: SessionCount, index: number) => {
        const productName = typeof record.productId === 'string' ? record.productId : record.productId.nameAr;
        const isCompleted = selectedSession?.status === 'completed';

        return (
            <DataCard
                title={productName}
                badge={
                    record.location === 'warehouse' 
                        ? <Tag color="purple" style={{ margin: 0 }} icon={<InboxOutlined />}>المخزن</Tag> 
                        : <Tag color="blue" style={{ margin: 0 }} icon={<ShopOutlined />}>الرف</Tag>
                }
                properties={[
                    {
                        label: 'الرصيد المتوقع بالسيستم',
                        value: record.expectedQty
                    },
                    {
                        label: 'الفارق',
                        value: (
                            <Text type={record.discrepancy === 0 ? 'success' : record.discrepancy > 0 ? 'warning' : 'danger'} strong>
                                {record.discrepancy > 0 ? `+${record.discrepancy}` : record.discrepancy}
                            </Text>
                        )
                    },
                    {
                        label: 'العد الفعلي',
                        fullWidth: true,
                        value: (
                            <Flex align="center" style={{ width: '100%', marginTop: 8 }}>
                                <Button
                                    size="large"
                                    disabled={isCompleted}
                                    onClick={() => handleQtyChange(index, record.actualQty - 1, record.expectedQty)}
                                    icon={<MinusOutlined />}
                                    style={{ width: 56, borderRadius: '8px 0 0 8px' }}
                                />
                                <InputNumber
                                    min={0}
                                    size="large"
                                    value={record.actualQty}
                                    disabled={isCompleted}
                                    onChange={(value) => handleQtyChange(index, Number(value ?? 0), record.expectedQty)}
                                    style={{ flex: 1, textAlign: 'center', borderRadius: 0, fontSize: 18 }}
                                    controls={false}
                                />
                                <Button
                                    size="large"
                                    disabled={isCompleted}
                                    onClick={() => handleQtyChange(index, record.actualQty + 1, record.expectedQty)}
                                    icon={<PlusOutlined />}
                                    style={{ width: 56, borderRadius: '0 8px 8px 0' }}
                                />
                            </Flex>
                        )
                    }
                ]}
            />
        );
    };

    if (!mounted) return null;

    return (
        <Row gutter={[16, 16]}>
            {/* --- Left Column: Sessions List --- */}
            <Col xs={24} xl={7}>
                <Card
                    title="جلسات الجرد"
                    size={isMobile ? "small" : "default"}
                    styles={{ body: { padding: isMobile ? 0 : 24 } }}
                    extra={
                        <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            loading={startMutation.isPending}
                            onClick={() => void startMutation.mutateAsync()}
                            size={isMobile ? "small" : "middle"}
                        >
                            بدء جلسة جديدة
                        </Button>
                    }
                >
                    <div style={{ maxHeight: isMobile ? 'none' : 'calc(100vh - 300px)', overflowY: 'auto' }}>
                        <Flex vertical>
                            {sessionsQuery.data?.map((session) => {
                                const isSelected = session._id === selectedSessionId;
                                return (
                                    <div
                                        key={session._id}
                                        onClick={() => {
                                            setSelectedSessionId(session._id);
                                            if (isMobile && detailsRef.current) {
                                                detailsRef.current.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }}
                                        style={{
                                            cursor: 'pointer',
                                            padding: '16px',
                                            background: isSelected ? '#e6f4ff' : '#fff',
                                            borderLeft: isSelected ? '4px solid #1677ff' : '4px solid transparent',
                                            borderBottom: '1px solid #f0f0f0',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                                            <Text strong={isSelected} style={{ fontSize: 15 }}>
                                                {dayjs(session.startedAt).format('YYYY-MM-DD HH:mm')}
                                            </Text>
                                            <Tag color={session.status === 'completed' ? 'green' : 'blue'} style={{ margin: 0 }}>
                                                {session.status === 'completed' ? 'مكتمل' : 'جاري'}
                                            </Tag>
                                        </Flex>
                                    </div>
                                );
                            })}
                            {!sessionsQuery.isLoading && (!sessionsQuery.data || sessionsQuery.data.length === 0) && (
                                <Empty description="لا توجد جلسات جرد" style={{ margin: '24px 0' }} />
                            )}
                        </Flex>
                    </div>
                </Card>
            </Col>

            {/* --- Right Column: Session Details --- */}
            <Col xs={24} xl={17} ref={detailsRef}>
                <Card size={isMobile ? "small" : "default"} styles={{ body: { padding: isMobile ? 12 : 24 } }}>
                    {selectedSession ? (
                        <Flex vertical gap={24} style={{ width: '100%' }}>
                            
                            {/* Header Info */}
                            <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                                <div>
                                    <Title level={isMobile ? 5 : 4} style={{ margin: 0, marginBottom: 4 }}>
                                        جلسة الجرد الحالية
                                    </Title>
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        بدأت في {dayjs(selectedSession.startedAt).format('YYYY-MM-DD HH:mm')}
                                    </Text>
                                </div>
                                <Tag color={selectedSession.status === 'completed' ? 'success' : 'processing'} style={{ padding: '4px 12px', fontSize: 14 }}>
                                    {selectedSession.status === 'completed' ? 'مكتملة - تم الاعتماد' : 'قيد التنفيذ'}
                                </Tag>
                            </Flex>

                            <Divider style={{ margin: 0 }} />

                            {/* Action Buttons */}
                            <Flex vertical={isMobile} gap={12}>
                                <Button
                                    icon={<SaveOutlined />}
                                    type="primary"
                                    size="large"
                                    loading={saveMutation.isPending}
                                    disabled={selectedSession.status === 'completed'}
                                    onClick={() => void saveMutation.mutateAsync()}
                                    block={isMobile}
                                    style={{ flex: 1 }}
                                >
                                    حفظ العد المؤقت
                                </Button>
                                <Button
                                    icon={<CheckCircleOutlined />}
                                    type="primary"
                                    danger
                                    size="large"
                                    loading={approveMutation.isPending}
                                    disabled={selectedSession.status === 'completed'}
                                    onClick={() => void approveMutation.mutateAsync()}
                                    block={isMobile}
                                    style={{ flex: 1 }}
                                >
                                    اعتماد الجرد وتحديث المخزون
                                </Button>
                            </Flex>

                            {/* Data Rendering */}
                            <ResponsiveDataView
                                data={counts}
                                loading={sessionQuery.isLoading}
                                tableColumns={columns}
                                renderCard={renderCountCard}
                                rowKey={(record) => `${typeof record.productId === 'string' ? record.productId : record.productId._id}-${record.location}`}
                                pagination={false}
                                tableProps={{ size: 'middle' }}
                            />

                        </Flex>
                    ) : (
                        <Empty description="اختر جلسة جرد من القائمة أو ابدأ جلسة جديدة" style={{ margin: '40px 0' }} />
                    )}
                </Card>
            </Col>
        </Row>
    );
}