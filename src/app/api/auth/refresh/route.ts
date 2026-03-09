import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyRefreshToken } from '@/lib/auth/jwt';
import { generateTokenPair } from '@/lib/services/auth.service';

export async function POST() {
    try {
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get('refresh-token')?.value;

        if (!refreshToken) {
            return NextResponse.json(
                { error: { code: 'UNAUTHORIZED', message: 'لم يتم العثور على رمز التحديث' } },
                { status: 401 }
            );
        }

        const decoded = verifyRefreshToken(refreshToken);
        const { accessToken, refreshToken: newRefreshToken } = generateTokenPair({
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        });

        const response = NextResponse.json({ success: true }, { status: 200 });

        response.cookies.set('auth-token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24,
        });

        response.cookies.set('refresh-token', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        });

        return response;
    } catch {
        return NextResponse.json(
            { error: { code: 'UNAUTHORIZED', message: 'رمز التحديث غير صالح' } },
            { status: 401 }
        );
    }
}
