'use client';

import { ReactNode } from 'react';
import { Layout, Typography, Space, Button } from 'antd';
import { LogoutOutlined, HomeOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function POSLayout({ children }: { children: ReactNode }) {
    return (
        <Layout style={{ minHeight: '100vh', direction: 'rtl' }}>
            <Header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fff',
                padding: '0 24px',
                borderBottom: '1px solid #f0f0f0'
            }}>
                <Space size="large">
                    <Title level={4} style={{ margin: 0, color: '#1677ff' }}>PillPay POS</Title>
                </Space>
                <Space>
                    <Link href="/dashboard">
                        <Button icon={<HomeOutlined />} type="text">اللوحة الرئيسية</Button>
                    </Link>
                    <form action="/api/auth/logout" method="POST">
                        <Button htmlType="submit" icon={<LogoutOutlined />} type="text" danger>خروج</Button>
                    </form>
                </Space>
            </Header>
            <Content style={{ padding: '24px', background: '#f5f5f5' }}>
                {children}
            </Content>
        </Layout>
    );
}
