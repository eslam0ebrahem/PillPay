import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from './jwt';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import type { AuthUser, PermissionKey } from '@/lib/types';

export type AuthenticatedHandler = (
    req: NextRequest,
    context: { params: Promise<Record<string, string>>; user: AuthUser }
) => Promise<NextResponse>;

/**
 * Wrap an API route handler with JWT cookie validation.
 * Extracts user from auth-token cookie and passes to handler.
 */
export function withAuth(handler: AuthenticatedHandler) {
    return async (
        req: NextRequest,
        context: { params: Promise<Record<string, string>> }
    ): Promise<NextResponse> => {
        try {
            const cookieStore = await cookies();
            const token = cookieStore.get('auth-token')?.value;

            if (!token) {
                return NextResponse.json(
                    { error: { code: 'UNAUTHORIZED', message: 'غير مصرح لك بالوصول' } },
                    { status: 401 }
                );
            }

            const decoded = verifyAccessToken(token);
            await connectDB();

            const user = await User.findById(decoded.userId).lean() as
                | { _id: { toString(): string }; email: string; name: string; role: string; permissions: string[]; isActive: boolean }
                | null;

            if (!user || !user.isActive) {
                return NextResponse.json(
                    { error: { code: 'UNAUTHORIZED', message: 'الحساب غير نشط أو غير موجود' } },
                    { status: 401 }
                );
            }

            const authUser: AuthUser = {
                _id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: user.role as AuthUser['role'],
                permissions: user.permissions as PermissionKey[],
                isActive: user.isActive,
            };

            return handler(req, { params: context.params, user: authUser });
        } catch {
            return NextResponse.json(
                { error: { code: 'UNAUTHORIZED', message: 'جلسة غير صالحة' } },
                { status: 401 }
            );
        }
    };
}

/**
 * Wrap an authenticated handler with permission check.
 * Owner role has full access; cashier requires specific permission.
 */
export function withPermission(
    permission: PermissionKey,
    handler: AuthenticatedHandler
) {
    return withAuth(async (req, context) => {
        const { user } = context;

        if (user.role !== 'owner' && !user.permissions.includes(permission)) {
            return NextResponse.json(
                { error: { code: 'FORBIDDEN', message: 'ليس لديك صلاحية لهذا الإجراء' } },
                { status: 403 }
            );
        }

        return handler(req, context);
    });
}
