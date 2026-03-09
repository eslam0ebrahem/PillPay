'use client';

import { useAuth } from '@/hooks/useAuth';
import type { PermissionKey } from '@/lib/types';

interface PermissionGuardProps {
    permission: PermissionKey;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function PermissionGuard({
    permission,
    children,
    fallback = null,
}: PermissionGuardProps) {
    const { user } = useAuth();

    if (!user) return fallback;

    // Owners have all permissions
    if (user.role === 'owner') return <>{children}</>;

    // Check specific permission
    if (user.permissions.includes(permission)) return <>{children}</>;

    return <>{fallback}</>;
}
