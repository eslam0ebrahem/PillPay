import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { withPermission } from '@/lib/auth/middleware';
import { logAction } from '@/lib/services/audit.service';
import { importFromJSON } from '@/lib/services/backup.service';

export const POST = withPermission('backup.manage', async (request: NextRequest, context) => {
    try {
        const contentType = request.headers.get('content-type') || '';
        let rawData = '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file');

            if (!(file instanceof File)) {
                return NextResponse.json(
                    { error: { code: 'INVALID_FILE', message: 'يرجى اختيار ملف نسخة احتياطية صالح' } },
                    { status: 400 }
                );
            }

            rawData = await file.text();
        } else {
            rawData = await request.text();
        }

        if (!rawData.trim()) {
            return NextResponse.json(
                { error: { code: 'EMPTY_FILE', message: 'ملف النسخة الاحتياطية فارغ' } },
                { status: 400 }
            );
        }

        const result = await importFromJSON(rawData);

        await logAction({
            userId: context.user._id,
            action: 'BACKUP_IMPORTED',
            entityType: 'Backup',
            entityId: new Types.ObjectId().toString(),
            details: result,
        });

        return NextResponse.json({ data: result });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر استيراد النسخة الاحتياطية';
        const status =
            message.includes('النسخة الاحتياطية') || message.includes('تعذر قراءة') ? 400 : 500;
        return NextResponse.json(
            { error: { code: 'BACKUP_IMPORT_ERROR', message } },
            { status }
        );
    }
});
