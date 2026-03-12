'use client';

import { useState } from 'react';
import { Tabs, Card, Button, Row, Col, Statistic, App, Tag, Typography, Flex, Descriptions, Divider, Space } from 'antd';
import { 
    EditOutlined, 
    ArrowRightOutlined, 
    PhoneOutlined, 
    MailOutlined, 
    HomeOutlined, 
    IdcardOutlined,
    HistoryOutlined,
    FileTextOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import SupplierForm, { SupplierFormValues } from '@/components/suppliers/SupplierForm';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';

const { Title, Text } = Typography;

interface SupplierDetailClientProps {
    supplier: any;
    recentInvoices: any[];
    recentPayments: any[];
}

export default function SupplierDetailClient({ supplier, recentInvoices, recentPayments }: SupplierDetailClientProps) {
    const { message } = App.useApp();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdate = async (values: SupplierFormValues) => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/suppliers/${supplier._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'فشل تحديث المورد');
            }

            message.success('تم التحديث بنجاح');
            setIsEditing(false);
            router.refresh();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const infoTab = (
        <div style={{ marginTop: 16 }}>
            {!isEditing ? (
                <Card 
                    variant="borderless"
                    style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                    extra={
                        <Button 
                            type="primary" 
                            ghost 
                            icon={<EditOutlined />} 
                            onClick={() => setIsEditing(true)}
                        >
                            {ar.actions?.edit || 'تعديل البيانات'}
                        </Button>
                    }
                >
                    <Descriptions 
                        column={{ xs: 1, sm: 2, md: 2 }} 
                        layout="vertical"
                        bordered
                        size="small"
                    >
                        <Descriptions.Item label={<Space><PhoneOutlined /> {ar.suppliers.phone}</Space>}>
                            {supplier.phone ? <a href={`tel:${supplier.phone}`}>{supplier.phone}</a> : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={<Space><InfoCircleOutlined /> {ar.suppliers.contactPerson}</Space>}>
                            {supplier.contactPerson || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={<Space><MailOutlined /> البريد الإلكتروني</Space>}>
                            {supplier.email || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={<Space><IdcardOutlined /> {ar.suppliers.taxId}</Space>}>
                            {supplier.taxId || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={<Space><IdcardOutlined /> السجل التجاري</Space>}>
                            {supplier.commercialRegister || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={<Space><HomeOutlined /> العنوان</Space>} span={2}>
                            {supplier.address || '-'}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>
            ) : (
                <Card 
                    variant="borderless"
                    title="تعديل بيانات المورد"
                    style={{ borderRadius: 12 }}
                    extra={<Button danger type="text" onClick={() => setIsEditing(false)}>إلغاء</Button>}
                >
                    <SupplierForm 
                        initialValues={supplier} 
                        onSubmit={handleUpdate} 
                        isSubmitting={isSubmitting} 
                    />
                </Card>
            )}
        </div>
    );

    const items = [
        {
            key: '1',
            label: <Space><InfoCircleOutlined /> البيانات الأساسية</Space>,
            children: infoTab
        },
        {
            key: '2',
            label: <Space><FileTextOutlined /> الفواتير</Space>,
            children: (
                <Card style={{ marginTop: 16, borderRadius: 12, textAlign: 'center' }}>
                    <Text type="secondary">سجل الفواتير سيظهر هنا قريباً...</Text>
                </Card>
            )
        },
        {
            key: '3',
            label: <Space><HistoryOutlined /> المدفوعات</Space>,
            children: (
                <Card style={{ marginTop: 16, borderRadius: 12, textAlign: 'center' }}>
                    <Text type="secondary">سجل المدفوعات التاريخي سيظهر هنا قريباً...</Text>
                </Card>
            )
        }
    ];

    return (
        <Flex vertical gap={24} style={{ paddingBottom: 40 }}>
            {/* --- Header & Financial Summary --- */}
            <Card 
                variant="borderless"
                style={{ 
                    borderRadius: 16, 
                    background: '#fff', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    borderInlineStart: `6px solid ${supplier.totalOwed > 0 ? '#ff4d4f' : '#52c41a'}`
                }}
            >
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={16}>
                        <Flex vertical>
                            <Space align="center" wrap>
                                <Title level={3} style={{ margin: 0 }}>{supplier.name}</Title>
                                <Tag color={supplier.isActive ? 'success' : 'default'} style={{ borderRadius: 6 }}>
                                    {supplier.isActive ? 'نشط' : 'غير نشط'}
                                </Tag>
                            </Space>
                            <Text type="secondary" style={{ marginTop: 4 }}>
                                معرف المورد: <Text code>{supplier._id.slice(-6).toUpperCase()}</Text>
                            </Text>
                        </Flex>
                    </Col>
                    <Col xs={24} sm={8}>
                        <div style={{ 
                            textAlign: 'left', 
                            padding: '12px', 
                            background: supplier.totalOwed > 0 ? '#fff1f0' : '#f6ffed', 
                            borderRadius: 12 
                        }}>
                            <Statistic 
                                title={ar.suppliers.totalOwed} 
                                value={supplier.totalOwed || 0} 
                                precision={2} 
                                suffix="ج.م"
                                valueStyle={{ 
                                    color: supplier.totalOwed > 0 ? '#cf1322' : '#3f8600',
                                    fontWeight: 'bold',
                                    fontSize: '24px'
                                }} 
                            />
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* --- Main Navigation Tabs --- */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '8px 16px' }}>
                <Tabs 
                    defaultActiveKey="1" 
                    items={items} 
                    size="large"
                    tabBarGutter={32}
                />
            </div>

            {/* --- Sticky Back Button for Mobile --- */}
            <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 1000 }}>
                <Button 
                    type="default" 
                    shape="circle" 
                    size="large" 
                    icon={<ArrowRightOutlined />} 
                    onClick={() => router.push('/suppliers')}
                    style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                />
            </div>
        </Flex>
    );
}