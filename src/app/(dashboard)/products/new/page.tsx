export const dynamic = 'force-dynamic';

import { Typography } from 'antd';
import NewProductClientWrapper from '@/components/products/NewProductClientWrapper';
import ar from '@/i18n/ar';

const { Title } = Typography;

export default function NewProductPage() {
    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>
                {ar.products.addProduct}
            </Title>

            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <NewProductClientWrapper />
            </div>
        </div>
    );
}
