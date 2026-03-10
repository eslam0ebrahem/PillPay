'use client';

import { Input, Button, Space, Tag, Typography, Card, Row, Col } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import ResponsiveDataView from '../common/ResponsiveDataView';

const { Search } = Input;
const { Text } = Typography;

interface SupplierListProps {
    data: any[];
    loading: boolean;
    onSearch: (value: string) => void;
}

export default function SupplierList({ data, loading, onSearch }: SupplierListProps) {
    const columns = [
        {
            title: ar.suppliers.name,
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: ar.suppliers.phone,
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: ar.suppliers.contactPerson,
            dataIndex: 'contactPerson',
            key: 'contactPerson',
        },
        {
            title: ar.suppliers.totalOwed,
            dataIndex: 'totalOwed',
            key: 'totalOwed',
            render: (val: number) => {
                const color = val > 0 ? 'red' : 'green';
                return <Tag color={color}>{formatPiasters(val || 0)}</Tag>;
            },
        },
        {
            title: 'الحالة',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (active: boolean) => (
                <Tag color={active ? 'blue' : 'default'}>{active ? 'نشط' : 'غير نشط'}</Tag>
            ),
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space>
                    <Link href={`/suppliers/${record._id}`}>
                        <Button icon={<EyeOutlined />} size="small" type="text" />
                    </Link>
                </Space>
            ),
        },
    ];

    const renderCard = (record: any) => (
        <Card size="small" style={{ marginBottom: 12, borderRadius: 12 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                <Col>
                    <Link href={`/suppliers/${record._id}`}>
                        <Text strong style={{ fontSize: 16, color: '#1677ff' }}>{record.name}</Text>
                    </Link>
                    <div style={{ marginTop: 4 }}>
                        {!record.isActive && <Tag color="default">غير نشط</Tag>}
                    </div>
                </Col>
                <Col style={{ textAlign: 'right' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>إجمالي المديونية</Text><br />
                    <Text strong type={record.totalOwed > 0 ? 'danger' : 'success'}>
                        {formatPiasters(record.totalOwed || 0)}
                    </Text>
                </Col>
            </Row>

            <div style={{ background: '#f5f5f5', padding: '8px 12px', borderRadius: 8 }}>
                <Row gutter={8}>
                    <Col span={8}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{ar.suppliers.phone}</Text><br />
                        <Text>{record.phone || '-'}</Text>
                    </Col>
                    <Col span={8}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{ar.suppliers.contactPerson}</Text><br />
                        <Text>{record.contactPerson || '-'}</Text>
                    </Col>
                    <Col span={8} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Link href={`/suppliers/${record._id}`}>
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
        <div>
            <div style={{ marginBottom: 16 }}>
                <Search
                    placeholder="ابحث باسم المورد أو الهاتف..."
                    allowClear
                    onSearch={onSearch}
                    style={{ width: '100%', maxWidth: 400 }}
                    size="large"
                />
            </div>

            <ResponsiveDataView
                data={data}
                tableColumns={columns}
                rowKey="_id"
                loading={loading}
                renderCard={renderCard}
                tableProps={{
                    scroll: { x: 'max-content' }
                }}
            />
        </div>
    );
}
