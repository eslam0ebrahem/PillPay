import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import Unit from '@/lib/models/Unit';

export const PUT = withPermission('users.manage', async (req: NextRequest, props: { params: Promise<{ id: string }> }) => {
    try {
        await connectDB();
        const { id } = await props.params;
        const body = await req.json();

        // Check if updating the code to something that already exists
        if (body.code) {
            const existing = await Unit.findOne({ code: body.code, _id: { $ne: id } });
            if (existing) {
                return NextResponse.json({ error: { message: 'Unit with this code already exists' } }, { status: 400 });
            }
        }

        const unit = await Unit.findByIdAndUpdate(id, body, { new: true });
        if (!unit) {
            return NextResponse.json({ error: { message: 'Unit not found' } }, { status: 404 });
        }

        return NextResponse.json(unit);
    } catch (error: any) {
        return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }
});

export const DELETE = withPermission('users.manage', async (req: NextRequest, props: { params: Promise<{ id: string }> }) => {
    try {
        await connectDB();
        const { id } = await props.params;

        const unit = await Unit.findByIdAndDelete(id);
        if (!unit) {
            return NextResponse.json({ error: { message: 'Unit not found' } }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }
});
