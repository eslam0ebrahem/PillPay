import { Schema, model, models, Document } from 'mongoose';

export interface IBrand extends Document {
    sourceId: number;
    nameAr: string;
    nameEn: string;
    image?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const brandSchema = new Schema<IBrand>(
    {
        sourceId: {
            type: Number,
            required: true,
            unique: true,
        },
        nameAr: {
            type: String,
            required: true,
            trim: true,
        },
        nameEn: {
            type: String,
            required: true,
            trim: true,
        },
        image: {
            type: String,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

brandSchema.index({ nameAr: 'text', nameEn: 'text' });
brandSchema.index({ isActive: 1 });

const Brand = models.Brand || model<IBrand>('Brand', brandSchema);

export default Brand;
