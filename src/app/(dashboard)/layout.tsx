import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/login');
    }

    return <AppShell>{children}</AppShell>;
}
