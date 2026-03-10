'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Card, Button, Input, Space, Switch, App, Row, Col, Grid } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import CustomerForm from '@/components/customers/CustomerForm';
import ResponsiveDataView from '@/components/common/ResponsiveDataView';
import MobileFormWrapper from '@/components/common/MobileFormWrapper';
import PageHeader from '@/components/common/PageHeader';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function CustomersPage() {
    const { message } = App.useApp();
    const router = useRouter();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [hasDebtOnly, setHasDebtOnly] = useState(false);

    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [adding, setAdding] = useState(false);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams();
            if (search) query.append('search', search);
            if (hasDebtOnly) query.append('hasDebt', 'true');

            const res = await fetch(`/api/customers?${query.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch customers');

            const { data } = await res.json();
            setCustomers(data);
        } catch (error) {
            message.error('حدث خطأ أثناء جلب بيانات العملاء');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchCustomers();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [search, hasDebtOnly]);

    const handleAddCustomer = async (values: any) => {
        try {
            setAdding(true);
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) throw new Error('فشل إضافة العميل');

            message.success('تم إضافة العميل بنجاح');
            setIsAddModalVisible(false);
            fetchCustomers();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setAdding(false);
        }
    };

    const columns = [
        { title: 'اسم العميل', dataIndex: 'name', key: 'name' },
        { title: 'رقم الهاتف', dataIndex: 'phone', key: 'phone', render: (val: string) => val || '-' },
        {
            title: 'إجمالي المديونية',
            dataIndex: 'totalOwed',
            key: 'totalOwed',
            render: (val: number) => (
                <span className={val > 0 ? 'text-red-500 font-bold' : ''}>
                    <MoneyDisplay amount={val} />
                </span>
            )
        },
        {
            title: 'إجراءات',
            key: 'actions',
            render: (_: any, record: any) => (
                <Button
                    icon={<EyeOutlined />}
                    onClick={() => router.push(`/customers/${record._id}`)}
                >
                    عرض التفاصيل
                </Button>
            ),
        },
    ];

    const renderCard = (record: any) => (
        <Card size="small" style={{ marginBottom: 12, borderRadius: 12 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                <Col>
                    <Link href={`/customers/${record._id}`}>
                        <Text strong style={{ fontSize: 16, color: '#1677ff' }}>{record.name}</Text>
                    </Link>
                </Col>
                <Col>
                    {record.phone && <Text type="secondary">{record.phone}</Text>}
                </Col>
            </Row>

            <div style={{ background: '#f5f5f5', padding: '8px 12px', borderRadius: 8, marginTop: 8 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Text type="secondary" style={{ fontSize: 12 }}>إجمالي المديونية:</Text><br />
                        <Text strong type={record.totalOwed > 0 ? 'danger' : undefined} style={{ fontSize: 16 }}>
                            <MoneyDisplay amount={record.totalOwed} />
                        </Text>
                    </Col>
                    <Col>
                        <Link href={`/customers/${record._id}`}>
                            <Button type="primary" size="small" icon={<EyeOutlined />}>
                                التفاصيل
                            </Button>
                        </Link>
                    </Col>
                </Row>
            </div>
        </Card>
    );

    return (
        <div style={{ maxWidth: 1152, margin: '0 auto' }}>
            <PageHeader
                title="العملاء والمديونيات"
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsAddModalVisible(true)}
                    >
                        إضافة عميل
                    </Button>
                }
            />

            <Card style={{ marginBottom: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Input
                        placeholder="ابحث بالاسم أو رقم الهاتف..."
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ maxWidth: 400, flex: 1 }}
                        size="large"
                        allowClear
                    />
                    <Space>
                        <Text type="secondary">عرض أصحاب الديون فقط</Text>
                        <Switch
                            checked={hasDebtOnly}
                            onChange={setHasDebtOnly}
                        />
                    </Space>
                </div>
            </Card>

            <ResponsiveDataView
                data={customers}
                tableColumns={columns}
                rowKey="_id"
                loading={loading}
                renderCard={renderCard}
                pagination={{ defaultPageSize: 20 }}
                tableProps={{
                    className: "shadow-sm",
                    style: { backgroundColor: 'white' }
                }}
            />

            <MobileFormWrapper
                title="إضافة عميل جديد"
                open={isAddModalVisible}
                onClose={() => setIsAddModalVisible(false)}
                destroyOnHidden
            >
                {isAddModalVisible && (
                    <CustomerForm onSubmit={handleAddCustomer} isLoading={adding} />
                )}
            </MobileFormWrapper>
        </div>
    );
}
