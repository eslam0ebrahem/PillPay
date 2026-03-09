import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import { getSettings, updateSettings } from '@/lib/models/Settings';
import { logAction } from '@/lib/services/audit.service';
import { settingsSchema } from '@/lib/utils/validation';

export const GET = withPermission('settings.view', async () => {
    try {
        await connectDB();
        const settings = await getSettings();
        return NextResponse.json({ data: settings });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر تحميل الإعدادات';
        return NextResponse.json(
            { error: { code: 'SETTINGS_ERROR', message } },
            { status: 500 }
        );
    }
});

export const PUT = withPermission('settings.manage', async (request: NextRequest, context) => {
    try {
        await connectDB();
        const payload = settingsSchema.parse(await request.json());
        const currentSettings = await getSettings();
        const settings = await updateSettings(payload);

        await logAction({
            userId: context.user._id,
            action: 'SETTINGS_UPDATED',
            entityType: 'Settings',
            entityId: new Types.ObjectId().toString(),
            details: {
                previous: {
                    expiringSoonDays: currentSettings.expiringSoonDays,
                    defaultLowStockThreshold: currentSettings.defaultLowStockThreshold,
                    maxDiscountPercentage: currentSettings.maxDiscountPercentage,
                },
                next: payload,
            },
        });

        return NextResponse.json({ data: settings });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'بيانات الإعدادات غير صالحة',
                        details: error.issues.map((issue) => ({
                            field: issue.path.join('.'),
                            message: issue.message,
                        })),
                    },
                },
                { status: 400 }
            );
        }

        const message = error instanceof Error ? error.message : 'تعذر حفظ الإعدادات';
        return NextResponse.json(
            { error: { code: 'SETTINGS_UPDATE_ERROR', message } },
            { status: 500 }
        );
    }
});
