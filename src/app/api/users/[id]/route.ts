import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { logAction } from '@/lib/services/audit.service';
import { updateUserSchema, isValidObjectId } from '@/lib/utils/validation';
import {
    ALL_PERMISSIONS,
    CASHIER_DEFAULT_PERMISSIONS,
    type PermissionKey,
    type UserRole,
} from '@/lib/types';

function normalizePermissions(role: UserRole, permissions?: string[]): PermissionKey[] {
    if (role === 'owner') {
        return [];
    }

    if (permissions === undefined) {
        return [...CASHIER_DEFAULT_PERMISSIONS];
    }

    const invalidPermissions = permissions.filter(
        (permission) => !ALL_PERMISSIONS.includes(permission as PermissionKey)
    );

    if (invalidPermissions.length > 0) {
        throw new Error(`صلاحيات غير معروفة: ${invalidPermissions.join(', ')}`);
    }

    return Array.from(new Set(permissions)) as PermissionKey[];
}

function serializeUser(user: {
    _id: { toString(): string };
    name: string;
    email: string;
    role: UserRole;
    permissions: PermissionKey[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}) {
    return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export const PUT = withPermission('users.manage', async (request: NextRequest, context) => {
    try {
        await connectDB();

        const params = await context.params;
        const userId = params.id;

        if (!isValidObjectId(userId)) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'المعرف غير صالح' } },
                { status: 400 }
            );
        }

        const payload = updateUserSchema.parse(await request.json());
        const user = await User.findById(userId);

        if (!user) {
            return NextResponse.json(
                { error: { code: 'NOT_FOUND', message: 'المستخدم غير موجود' } },
                { status: 404 }
            );
        }

        const nextRole = payload.role ?? user.role;
        const nextIsActive = payload.isActive ?? user.isActive;
        const wasCashier = user.role === 'cashier';

        if (user.role === 'owner' && (nextRole !== 'owner' || !nextIsActive)) {
            const otherActiveOwners = await User.countDocuments({
                _id: { $ne: user._id },
                role: 'owner',
                isActive: true,
            });

            if (otherActiveOwners === 0) {
                return NextResponse.json(
                    {
                        error: {
                            code: 'LAST_OWNER',
                            message: 'لا يمكن تعطيل أو تغيير آخر مالك نشط في النظام',
                        },
                    },
                    { status: 400 }
                );
            }
        }

        if (payload.email) {
            const email = payload.email.toLowerCase().trim();
            const existingUser = await User.findOne({
                email,
                _id: { $ne: user._id },
            });

            if (existingUser) {
                return NextResponse.json(
                    {
                        error: {
                            code: 'DUPLICATE_EMAIL',
                            message: 'البريد الإلكتروني مستخدم بالفعل',
                        },
                    },
                    { status: 409 }
                );
            }

            user.email = email;
        }

        if (payload.name !== undefined) {
            user.name = payload.name.trim();
        }

        user.role = nextRole;
        user.isActive = nextIsActive;

        if (nextRole === 'owner') {
            user.permissions = [];
        } else if (payload.permissions !== undefined) {
            user.permissions = normalizePermissions(nextRole, payload.permissions);
        } else if (wasCashier) {
            user.permissions = normalizePermissions(nextRole, user.permissions);
        } else {
            user.permissions = [...CASHIER_DEFAULT_PERMISSIONS];
        }

        if (payload.password) {
            user.passwordHash = payload.password;
        }

        await user.save();

        await logAction({
            userId: context.user._id,
            action: 'USER_UPDATED',
            entityType: 'User',
            entityId: user._id.toString(),
            details: {
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
                isActive: user.isActive,
                passwordReset: Boolean(payload.password),
            },
        });

        return NextResponse.json({ data: serializeUser(user.toObject()) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'بيانات تحديث المستخدم غير صالحة',
                        details: error.issues.map((issue) => ({
                            field: issue.path.join('.'),
                            message: issue.message,
                        })),
                    },
                },
                { status: 400 }
            );
        }

        const message = error instanceof Error ? error.message : 'تعذر تحديث المستخدم';
        const status = message.includes('صلاحيات غير معروفة') ? 400 : 500;
        return NextResponse.json({ error: { code: 'UPDATE_USER_ERROR', message } }, { status });
    }
});
