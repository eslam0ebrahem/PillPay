import { Schema, model, models, Document } from 'mongoose';

export interface IProduct extends Document {
    barcode?: string | null;
    nameAr: string;
    nameEn?: string;
    imageUrl?: string;
    manufacturer?: string;
    category?: string;
    description?: string;
    activeIngredient?: string;
    dosageForm?: string;
    route?: string;
    uses?: string;
    pharmacology?: string;
    sellingPrice: number;
    baseUnit: string;
    subUnit?: string | null;
    subUnitConversionFactor?: number | null;
    lowStockThreshold: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
    {
        barcode: {
            type: String,
            unique: true,
            sparse: true,
            default: null,
        },
        nameAr: {
            type: String,
            required: true,
            trim: true,
        },
        nameEn: {
            type: String,
            trim: true,
        },
        imageUrl: String,
        manufacturer: { type: String, trim: true },
        category: { type: String, trim: true },
        description: String,
        activeIngredient: { type: String, trim: true },
        dosageForm: { type: String, trim: true },
        route: { type: String, trim: true },
        uses: String,
        pharmacology: { type: String, trim: true },
        sellingPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        baseUnit: {
            type: String,
            required: true,
            trim: true,
        },
        subUnit: {
            type: String,
            default: null,
            trim: true,
        },
        subUnitConversionFactor: {
            type: Number,
            default: null,
            min: 1,
        },
        lowStockThreshold: {
            type: Number,
            default: 10,
            min: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Text index for Arabic/English search
productSchema.index(
    { nameAr: 'text', nameEn: 'text' },
    { default_language: 'arabic' }
);

// Category and active indexes
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });

const Product = models.Product || model<IProduct>('Product', productSchema);

export default Product;
