'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Card, Table, Button, Input, Space, Switch, Modal, App } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import CustomerForm from '@/components/customers/CustomerForm';

const { Title } = Typography;

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

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <Title level={2} className="!mb-0">العملاء والمديونيات</Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsAddModalVisible(true)}
                >
                    إضافة عميل
                </Button>
            </div>

            <Card className="shadow-sm mb-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <Input
                        placeholder="ابحث بالاسم أو رقم الهاتف..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-md"
                        size="large"
                        allowClear
                    />
                    <Space>
                        <span className="text-gray-600">عرض أصحاب الديون فقط</span>
                        <Switch
                            checked={hasDebtOnly}
                            onChange={setHasDebtOnly}
                        />
                    </Space>
                </div>
            </Card>

            <Table
                columns={columns}
                dataSource={customers}
                rowKey="_id"
                loading={loading}
                pagination={{ defaultPageSize: 20 }}
                className="shadow-sm"
            />

            <Modal
                title="إضافة عميل جديد"
                open={isAddModalVisible}
                onCancel={() => setIsAddModalVisible(false)}
                footer={null}
                destroyOnHidden
            >
                {isAddModalVisible && (
                    <CustomerForm onSubmit={handleAddCustomer} isLoading={adding} />
                )}
            </Modal>
        </div>
    );
}
