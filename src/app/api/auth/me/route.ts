import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

export const GET = withAuth(async (_req: NextRequest, { user }) => {
    return NextResponse.json({ user }, { status: 200 });
});
