export const dynamic = 'force-dynamic';

import { Typography, Card } from 'antd';
import NewSupplierClientWrapper from '@/components/suppliers/NewSupplierClientWrapper';
import ar from '@/i18n/ar';

const { Title } = Typography;

export default function NewSupplierPage() {
    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>
                {ar.suppliers.addSupplier}
            </Title>

            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <NewSupplierClientWrapper />
            </div>
        </div>
    );
}
