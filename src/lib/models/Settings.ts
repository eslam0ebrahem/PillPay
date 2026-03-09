import mongoose, { Schema, model, models } from 'mongoose';

export interface ISettings {
    _id: string;
    expiringSoonDays: number;
    defaultLowStockThreshold: number;
    maxDiscountPercentage: number;
    createdAt: Date;
    updatedAt: Date;
}

const settingsSchema = new Schema(
    {
        _id: {
            type: String,
            default: 'global',
        },
        expiringSoonDays: {
            type: Number,
            default: 90,
            min: 1,
        },
        defaultLowStockThreshold: {
            type: Number,
            default: 10,
            min: 0,
        },
        maxDiscountPercentage: {
            type: Number,
            default: 10000, // 10000 basis points = 100%
            min: 0,
            max: 10000,
        },
    },
    { timestamps: true }
);

const Settings = models.Settings || model('Settings', settingsSchema);

/** Get or create the global settings singleton */
export async function getSettings(): Promise<ISettings> {
    let settings = await Settings.findById('global').lean();
    if (!settings) {
        const created = await Settings.create({ _id: 'global' });
        return created.toObject() as unknown as ISettings;
    }
    return settings as unknown as ISettings;
}

/** Update settings with upsert */
export async function updateSettings(
    data: Partial<Pick<ISettings, 'expiringSoonDays' | 'defaultLowStockThreshold' | 'maxDiscountPercentage'>>
): Promise<ISettings> {
    const settings = await Settings.findByIdAndUpdate(
        'global',
        { $set: data },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    return settings as unknown as ISettings;
}

export default Settings;
