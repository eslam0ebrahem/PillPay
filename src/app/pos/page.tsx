import POSScreen from '@/components/pos/POSScreen';
import { Flex } from 'antd';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'نقاط البيع | PillPay POS',
    description: 'واجهة البيع السريع وإدارة فواتير العملاء',
};

export default function POSPage() {
    return (
        /**
         * We use a specialized container for the POS to ensure it 
         * occupies the full viewport height minus the header/tab-bar.
         * This prevents the "double scrollbar" issue common in complex POS UIs.
         */
        <main style={{ 
            height: 'calc(100vh - 64px)', // Adjusting for Header height
            width: '100%',
            overflow: 'hidden', // Let the POSScreen handle its own internal scrolling
            position: 'relative',
            background: '#f0f2f5'
        }}>
            <POSScreen />
        </main>
    );
}