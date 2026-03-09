import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import arEG from 'antd/locale/ar_EG';
import './globals.css';
import QueryProvider from '@/components/common/QueryProvider';

const cairo = Cairo({
    subsets: ['arabic', 'latin'],
    weight: ['300', '400', '500', '600', '700', '800', '900'],
    variable: '--font-cairo',
    display: 'swap',
});

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
        <html lang="ar" dir="rtl" className={cairo.variable}>
            <body className={cairo.className}>
                <AntdRegistry>
                    <ConfigProvider
                        direction="rtl"
                        locale={arEG}
                        theme={{
                            token: {
                                fontFamily: 'var(--font-cairo), system-ui, sans-serif',
                            },
                        }}
                    >
                        <QueryProvider>{children}</QueryProvider>
                    </ConfigProvider>
                </AntdRegistry>
            </body>
        </html>
    );
}
