import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/refresh'];

function decodeJWTPayload(token: string): { userId: string; email: string; role: string } | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        // Check expiry
        if (payload.exp && payload.exp * 1000 < Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip Next.js internals and static files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Allow public paths
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Allow all API routes to handle auth themselves
    if (pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    // Check auth token
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const decoded = decodeJWTPayload(token);

    if (!decoded) {
        // Invalid or expired token — redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth-token');
        return response;
    }

    // Root path redirect based on role
    if (pathname === '/') {
        if (decoded.role === 'owner') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return NextResponse.redirect(new URL('/pos', request.url));
    }

    // Already on login page while authenticated — redirect
    if (pathname === '/login') {
        if (decoded.role === 'owner') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return NextResponse.redirect(new URL('/pos', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
