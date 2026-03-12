'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { PermissionKey } from '@/lib/types';

interface PermissionGuardProps {
    // Upgraded: Now accepts a single permission OR an array of permissions
    permission: PermissionKey | PermissionKey[];
    // Upgraded: If passing an array, must the user have ALL of them, or just ANY?
    requireAll?: boolean; 
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function PermissionGuard({
    permission,
    requireAll = false,
    children,
    fallback = null,
}: PermissionGuardProps) {
    // Note: It is highly recommended your useAuth hook returns an `isLoading` flag.
    // I've destructured it safely here with a fallback in case you haven't added it yet.
    const { user, isLoading = false } = useAuth() as any;

    // 1. Prevent layout flickering while auth state is resolving
    if (isLoading) return null;

    // 2. Unauthenticated state
    if (!user) return <>{fallback}</>;

    // 3. Owners bypass all permission checks
    if (user.role === 'owner') return <>{children}</>;

    // 4. Safe evaluation of permissions
    const requiredPermissions = Array.isArray(permission) ? permission : [permission];
    
    // Fallback to empty array to prevent fatal `.includes()` crashes
    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];

    const hasAccess = requireAll
        ? requiredPermissions.every((p) => userPerms.includes(p))
        : requiredPermissions.some((p) => userPerms.includes(p));

    if (hasAccess) return <>{children}</>;

    // 5. Access denied
    return <>{fallback}</>;
}