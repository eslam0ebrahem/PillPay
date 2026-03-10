import { Schema, model, models, Document } from 'mongoose';

export interface ICategory extends Document {
    sourceId: number;
    nameAr: string;
    nameEn: string;
    imageAr?: string | null;
    imageEn?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
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
        imageAr: {
            type: String,
            default: null,
        },
        imageEn: {
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

categorySchema.index({ nameAr: 1 });
categorySchema.index({ nameEn: 1 });

const Category = models.Category || model<ICategory>('Category', categorySchema);

export default Category;
