import mongoose, { Schema, model, models, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import type { UserRole, PermissionKey } from '@/lib/types';

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    permissions: PermissionKey[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ['owner', 'cashier'],
            required: true,
        },
        permissions: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Pre-save hook: hash password if modified
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Method: compare password
userSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Exclude passwordHash from JSON output
userSchema.set('toJSON', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transform: (_doc: any, ret: Record<string, any>) => {
        ret.passwordHash = undefined;
        return ret;
    },
});

const User = models.User || model<IUser>('User', userSchema);

export default User;
