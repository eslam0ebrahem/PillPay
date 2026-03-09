import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import arEG from 'antd/locale/ar_EG';
import './globals.css';
import QueryProvider from '@/components/common/QueryProvider';

export const metadata: Metadata = {
    title: 'PillPay - نظام إدارة الصيدلية',
    description: 'نظام إدارة الصيدلية ونقاط البيع',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ar" dir="rtl">
            <body>
                <AntdRegistry>
                    <ConfigProvider direction="rtl" locale={arEG}>
                        <QueryProvider>{children}</QueryProvider>
                    </ConfigProvider>
                </AntdRegistry>
            </body>
        </html>
    );
}
