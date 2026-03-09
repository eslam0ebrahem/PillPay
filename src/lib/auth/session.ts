import { cookies } from 'next/headers';
import { verifyAccessToken } from './jwt';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import type { AuthUser, PermissionKey } from '@/lib/types';

/**
 * Get the current authenticated user from the auth-token cookie.
 * For use in Server Components.
 * Returns null if no valid session is found.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) return null;

        const decoded = verifyAccessToken(token);
        await connectDB();

        const user = await User.findById(decoded.userId).lean() as
            | { _id: { toString(): string }; email: string; name: string; role: string; permissions: string[]; isActive: boolean }
            | null;

        if (!user || !user.isActive) return null;

        return {
            _id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role as AuthUser['role'],
            permissions: user.permissions as PermissionKey[],
            isActive: user.isActive,
        };
    } catch {
        return null;
    }
}
