import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPaymentAllocation {
    invoiceId: mongoose.Types.ObjectId;
    amount: number; // in piasters
}

export interface ICustomerPayment extends Document {
    customerId: mongoose.Types.ObjectId;
    amount: number; // in piasters
    allocations: IPaymentAllocation[];
    receivedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const paymentAllocationSchema = new Schema<IPaymentAllocation>({
    invoiceId: { type: Schema.Types.ObjectId, ref: 'SaleInvoice', required: true },
    amount: { type: Number, required: true, min: 1 },
});

const customerPaymentSchema = new Schema<ICustomerPayment>(
    {
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        amount: { type: Number, required: true, min: 1 },
        allocations: [paymentAllocationSchema],
        receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

customerPaymentSchema.index({ customerId: 1, createdAt: -1 });

const CustomerPayment: Model<ICustomerPayment> =
    mongoose.models.CustomerPayment || mongoose.model<ICustomerPayment>('CustomerPayment', customerPaymentSchema);

export default CustomerPayment;
