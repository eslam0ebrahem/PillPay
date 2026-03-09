import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { logAction } from '@/lib/services/audit.service';
import { createUserSchema } from '@/lib/utils/validation';
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

export const GET = withPermission('users.manage', async (request: NextRequest) => {
    try {
        await connectDB();

        const searchParams = request.nextUrl.searchParams;
        const page = Math.max(1, Number(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
        const role = searchParams.get('role');
        const isActive = searchParams.get('isActive');
        const filter: Record<string, unknown> = {};

        if (role === 'owner' || role === 'cashier') {
            filter.role = role;
        }

        if (isActive === 'true' || isActive === 'false') {
            filter.isActive = isActive === 'true';
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('name email role permissions isActive createdAt updatedAt')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean<any[]>(),
            User.countDocuments(filter),
        ]);

        return NextResponse.json({
            data: users.map((user) => serializeUser(user)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر تحميل المستخدمين';
        return NextResponse.json(
            { error: { code: 'USERS_ERROR', message } },
            { status: 500 }
        );
    }
});

export const POST = withPermission('users.manage', async (request: NextRequest, context) => {
    try {
        await connectDB();

        const payload = createUserSchema.parse(await request.json());
        const email = payload.email.toLowerCase().trim();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { error: { code: 'DUPLICATE_EMAIL', message: 'البريد الإلكتروني مستخدم بالفعل' } },
                { status: 409 }
            );
        }

        const user = await User.create({
            email,
            passwordHash: payload.password,
            name: payload.name.trim(),
            role: payload.role,
            permissions: normalizePermissions(payload.role, payload.permissions),
            isActive: true,
        });

        await logAction({
            userId: context.user._id,
            action: 'USER_CREATED',
            entityType: 'User',
            entityId: user._id.toString(),
            details: {
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
            },
        });

        return NextResponse.json(
            { data: serializeUser(user.toObject()) },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'بيانات المستخدم غير صالحة',
                        details: error.issues.map((issue) => ({
                            field: issue.path.join('.'),
                            message: issue.message,
                        })),
                    },
                },
                { status: 400 }
            );
        }

        const message = error instanceof Error ? error.message : 'تعذر إنشاء المستخدم';
        const status = message.includes('صلاحيات غير معروفة') ? 400 : 500;
        return NextResponse.json(
            { error: { code: 'CREATE_USER_ERROR', message } },
            { status }
        );
    }
});
