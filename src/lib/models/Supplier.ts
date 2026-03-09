import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplier extends Document {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    contactPerson?: string;
    taxId?: string;
    commercialRegister?: string;
    notes?: string;
    totalOwed: number; // in piasters
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
    {
        name: { type: String, required: true },
        phone: { type: String },
        email: { type: String },
        address: { type: String },
        contactPerson: { type: String },
        taxId: { type: String },
        commercialRegister: { type: String },
        notes: { type: String },
        totalOwed: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Add text index for search
supplierSchema.index({ name: 'text' });

const Supplier: Model<ISupplier> = mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', supplierSchema);

export default Supplier;
