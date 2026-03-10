import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import Unit from '@/lib/models/Unit';

export const GET = withPermission('products.view', async (req: NextRequest) => {
    try {
        await connectDB();

        // Fetch all units and group them by type internally, 
        // or just return as a list for the frontend to handle.
        const units = await Unit.find({}).sort({ nameAr: 1 }).lean();

        const groupedUnits = {
            base_units: units.filter(u => u.type === 'base_unit'),
            sub_units: units.filter(u => u.type === 'sub_unit'),
            measurements: units.filter(u => u.type === 'measurement'),
        };

        return NextResponse.json({ data: groupedUnits });
    } catch (error: any) {
        return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }
});

// Admin-only creation endpoint
export const POST = withPermission('users.manage', async (req: NextRequest) => {
    try {
        await connectDB();
        const body = await req.json();

        const existing = await Unit.findOne({ code: body.code });
        if (existing) {
            return NextResponse.json({ error: { message: 'Unit with this code already exists' } }, { status: 400 });
        }

        const unit = new Unit(body);
        await unit.save();

        return NextResponse.json(unit, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }
});
