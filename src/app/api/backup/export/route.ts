import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { withPermission } from '@/lib/auth/middleware';
import { logAction } from '@/lib/services/audit.service';
import { exportAllData } from '@/lib/services/backup.service';

export const POST = withPermission('backup.manage', async (_request: NextRequest, context) => {
    try {
        const backup = await exportAllData();
        const fileName = `pillpay-backup-${new Date().toISOString().slice(0, 10)}.json`;

        await logAction({
            userId: context.user._id,
            action: 'BACKUP_EXPORTED',
            entityType: 'Backup',
            entityId: new Types.ObjectId().toString(),
            details: {
                exportedAt: backup.exportedAt,
                collectionCount: Object.keys(backup.collections).length,
            },
        });

        return new NextResponse(JSON.stringify(backup, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر تصدير النسخة الاحتياطية';
        return NextResponse.json(
            { error: { code: 'BACKUP_EXPORT_ERROR', message } },
            { status: 500 }
        );
    }
});
