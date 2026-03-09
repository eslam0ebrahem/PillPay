'use client';

import { useAuth } from './useAuth';
import type { PermissionKey } from '@/lib/types';

export function usePermissions() {
    const { user } = useAuth();

    const hasPermission = (permission: PermissionKey): boolean => {
        if (!user) return false;
        if (user.role === 'owner') return true;
        return user.permissions.includes(permission);
    };

    const isOwner = user?.role === 'owner';

    return {
        hasPermission,
        isOwner,
        user,
    };
}
