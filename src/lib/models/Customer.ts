import { Schema, model, models, Document } from 'mongoose';

export interface ICustomer extends Document {
    name: string;
    phone?: string | null;
    totalOwed: number;
    createdAt: Date;
    updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            sparse: true,
            trim: true,
            default: null,
        },
        totalOwed: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

// Text index for name search
customerSchema.index({ name: 'text' });

const Customer = models.Customer || model<ICustomer>('Customer', customerSchema);

export default Customer;
