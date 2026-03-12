import UnitsManagementClient from '@/components/settings/UnitsManagementClient';
import { Flex } from 'antd';

export const metadata = {
    title: 'إدارة الوحدات | PillPay',
    description: 'إدارة وحدات القياس والبيع والتشغيل للأدوية والمنتجات',
};

export default function UnitsPage() {
    return (
        <Flex vertical gap={24}>
            {/* We wrap the client component here to provide a consistent 
                top-level padding and layout structure across the settings module.
            */}
            <main style={{ width: '100%', minHeight: '100vh' }}>
                <UnitsManagementClient />
            </main>
        </Flex>
    );
}