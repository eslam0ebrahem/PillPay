'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, message, Skeleton } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import CustomerProfile from '@/components/customers/CustomerProfile';

export default function CustomerDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [data, setData] = useState<{
        customer: any;
        unpaidInvoices: any[];
        recentPayments: any[];
        recentAdjustments: any[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchCustomerData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/customers/${id}`);
            if (!res.ok) {
                if (res.status === 404) {
                    message.error('العميل غير موجود');
                    router.push('/customers');
                    return;
                }
                throw new Error('Failed to fetch profile');
            }
            const data = await res.json();
            setData(data);
        } catch (error) {
            message.error('خطأ في استرجاع بيانات العميل');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchCustomerData();
    }, [id]);

    if (loading || !data) {
        return <div className="p-8 max-w-4xl mx-auto"><Skeleton active paragraph={{ rows: 8 }} /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-6">
                <Button
                    type="link"
                    icon={<ArrowRightOutlined />}
                    onClick={() => router.push('/customers')}
                    className="p-0 text-gray-500 hover:text-gray-800"
                >
                    العودة لقائمة العملاء
                </Button>
            </div>

            <CustomerProfile
                customer={data.customer}
                unpaidInvoices={data.unpaidInvoices}
                recentPayments={data.recentPayments}
                recentAdjustments={data.recentAdjustments}
                onRefresh={fetchCustomerData}
            />
        </div>
    );
}
