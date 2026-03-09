export const dynamic = 'force-dynamic';

import PageHeader from '@/components/common/PageHeader';
import NewSupplierClientWrapper from '@/components/suppliers/NewSupplierClientWrapper';
import ar from '@/i18n/ar';

export default function NewSupplierPage() {
    return (
        <div>
            <PageHeader title={ar.suppliers.addSupplier} />

            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <NewSupplierClientWrapper />
            </div>
        </div>
    );
}
