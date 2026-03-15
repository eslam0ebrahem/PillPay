import jwt, { type SignOptions } from 'jsonwebtoken';
import type { JWTPayload } from '@/lib/types';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters long');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Use numeric seconds for expiry to avoid StringValue type issues
const ACCESS_TOKEN_EXPIRY = 60 * 60 * 24; // 24 hours in seconds
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds

export function generateAccessToken(payload: JWTPayload): string {
    const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRY };
    return jwt.sign(payload as object, JWT_SECRET, options);
}

export function generateRefreshToken(payload: JWTPayload): string {
    const options: SignOptions = { expiresIn: REFRESH_TOKEN_EXPIRY };
    return jwt.sign(payload as object, JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function verifyRefreshToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
}
