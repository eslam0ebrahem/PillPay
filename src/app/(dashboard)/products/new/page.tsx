export const dynamic = 'force-dynamic';

import PageHeader from '@/components/common/PageHeader';
import NewProductClientWrapper from '@/components/products/NewProductClientWrapper';
import ar from '@/i18n/ar';

export default function NewProductPage() {
    return (
        <div>
            <PageHeader title={ar.products.addProduct} />

            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <NewProductClientWrapper />
            </div>
        </div>
    );
}
