import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import AuditLog from '@/lib/models/AuditLog';

function parseDateBoundary(value: string | null, endOfDay = false) {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error('تاريخ التصفية غير صالح');
    }

    if (endOfDay) {
        date.setHours(23, 59, 59, 999);
    } else {
        date.setHours(0, 0, 0, 0);
    }

    return date;
}

function parseObjectId(value: string | null, fieldLabel: string) {
    if (!value) {
        return null;
    }

    if (!Types.ObjectId.isValid(value)) {
        throw new Error(`${fieldLabel} غير صالح`);
    }

    return new Types.ObjectId(value);
}

export const GET = withPermission('audit-logs.view', async (request: NextRequest) => {
    try {
        await connectDB();

        const searchParams = request.nextUrl.searchParams;
        const page = Math.max(1, Number(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
        const userId = parseObjectId(searchParams.get('userId'), 'المستخدم');
        const productId = parseObjectId(searchParams.get('productId'), 'المنتج');
        const action = searchParams.get('action');
        const entityType = searchParams.get('entityType');
        const invoiceNumber = searchParams.get('invoiceNumber');
        const from = parseDateBoundary(searchParams.get('from'));
        const to = parseDateBoundary(searchParams.get('to'), true);

        const filter: Record<string, unknown> = {};

        if (userId) {
            filter.userId = userId;
        }

        if (productId) {
            filter.productId = productId;
        }

        if (action) {
            filter.action = action;
        }

        if (entityType) {
            filter.entityType = entityType;
        }

        if (invoiceNumber) {
            filter.invoiceNumber = {
                $regex: invoiceNumber.trim(),
                $options: 'i',
            };
        }

        if (from || to) {
            filter.timestamp = {
                ...(from ? { $gte: from } : {}),
                ...(to ? { $lte: to } : {}),
            };
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('userId', 'name email')
                .populate('productId', 'nameAr barcode')
                .lean<any[]>(),
            AuditLog.countDocuments(filter),
        ]);

        return NextResponse.json({
            data: logs.map((log) => ({
                _id: log._id.toString(),
                action: log.action,
                entityType: log.entityType,
                entityId: log.entityId?.toString?.() ?? '',
                invoiceNumber: log.invoiceNumber ?? null,
                details: log.details ?? null,
                timestamp: log.timestamp,
                user: log.userId
                    ? {
                          _id: log.userId._id?.toString?.() ?? '',
                          name: log.userId.name,
                          email: log.userId.email,
                      }
                    : null,
                product: log.productId
                    ? {
                          _id: log.productId._id?.toString?.() ?? '',
                          nameAr: log.productId.nameAr,
                          barcode: log.productId.barcode ?? null,
                      }
                    : null,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر تحميل سجل المراجعة';
        const status = message.includes('غير صالح') ? 400 : 500;
        return NextResponse.json(
            { error: { code: 'AUDIT_LOGS_ERROR', message } },
            { status }
        );
    }
});
