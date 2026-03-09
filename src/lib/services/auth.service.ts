import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import type { JWTPayload, PermissionKey } from '@/lib/types';
import { CASHIER_DEFAULT_PERMISSIONS } from '@/lib/types';
import type { IUser } from '@/lib/models/User';

interface LoginResult {
    user: {
        _id: string;
        name: string;
        email: string;
        role: string;
        permissions: PermissionKey[];
    };
    accessToken: string;
    refreshToken: string;
}

/**
 * Authenticate user with email/password.
 * Returns user object and JWT tokens on success.
 */
export async function login(
    email: string,
    password: string
): Promise<LoginResult> {
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    if (!user.isActive) {
        throw new Error('هذا الحساب غير نشط');
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const payload: JWTPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
        user: {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions as PermissionKey[],
        },
        accessToken,
        refreshToken,
    };
}

/**
 * Generate new token pair from existing payload.
 */
export function generateTokenPair(payload: JWTPayload) {
    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
    };
}

/**
 * Seed the owner account on first run if no users exist.
 * Uses SEED_OWNER_* environment variables.
 */
export async function seedOwnerOnFirstRun(): Promise<void> {
    await connectDB();

    const userCount = await User.countDocuments();
    if (userCount > 0) return;

    const email = process.env.SEED_OWNER_EMAIL;
    const password = process.env.SEED_OWNER_PASSWORD;
    const name = process.env.SEED_OWNER_NAME;

    if (!email || !password || !name) {
        console.warn(
            'Seed owner env vars (SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD, SEED_OWNER_NAME) not set. Skipping owner seed.'
        );
        return;
    }

    await User.create({
        email,
        passwordHash: password, // Will be hashed by pre-save hook
        name,
        role: 'owner',
        permissions: [], // Owner has full access by role
        isActive: true,
    });

    console.log(`Owner account seeded: ${email}`);
}
