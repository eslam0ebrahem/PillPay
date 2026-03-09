export const dynamic = 'force-dynamic';

import DashboardSummaryClient from '@/components/reports/DashboardSummaryClient';
import { getAlertsDetail } from '@/lib/services/alerts.service';
import { getDashboardSummary } from '@/lib/services/report.service';

export default async function DashboardPage() {
    const [summary, alerts] = await Promise.all([
        getDashboardSummary(),
        getAlertsDetail(),
    ]);

    return <DashboardSummaryClient summary={summary} alerts={alerts} />;
}
