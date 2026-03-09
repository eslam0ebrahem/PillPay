export const dynamic = 'force-dynamic';

import PageHeader from '@/components/common/PageHeader';
import AuditSession from '@/components/stock/AuditSession';

export default function StockAuditPage() {
    return (
        <div>
            <PageHeader title="جرد المخزون" />
            <AuditSession />
        </div>
    );
}
