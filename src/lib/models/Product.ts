import { Schema, model, models, Document, Types } from 'mongoose';

export interface IProduct extends Document {
    barcode?: string | null;
    barcode2?: string | null;
    nameAr: string;
    nameEn?: string;
    imageUrl?: string;
    manufacturer?: string;
    category?: string;
    description?: string;
    descriptionEn?: string;
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
    // References
    brand?: Types.ObjectId | null;
    categoryRef?: Types.ObjectId | null;
    // Fields stored for future use
    sourceId?: number | null;
    brandId?: number | null;
    brandNameAr?: string;
    categoryId?: number | null;
    slug?: string;
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
        barcode2: {
            type: String,
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
        descriptionEn: String,
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
        // References
        brand: { type: Schema.Types.ObjectId, ref: 'Brand', default: null },
        categoryRef: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
        // Stored for future use
        sourceId: { type: Number, default: null },
        brandId: { type: Number, default: null },
        brandNameAr: { type: String, trim: true },
        categoryId: { type: Number, default: null },
        slug: { type: String, trim: true },
    },
    { timestamps: true }
);

// Text index for Arabic/English search
productSchema.index(
    { nameAr: 'text', nameEn: 'text' },
    { default_language: 'arabic' }
);

// Secondary barcode index for POS lookup (not unique)
productSchema.index({ barcode2: 1 }, { sparse: true });

// Reference indexes
productSchema.index({ brand: 1 });
productSchema.index({ categoryRef: 1 });

// Category and active indexes
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });

const Product = models.Product || model<IProduct>('Product', productSchema);

export default Product;
