import { Schema, model, models, Document } from 'mongoose';

export interface IUnit extends Document {
    code: string;
    nameEn: string;
    nameAr: string;
    type: 'base_unit' | 'sub_unit' | 'measurement';
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const unitSchema = new Schema<IUnit>(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        nameEn: {
            type: String,
            required: true,
            trim: true,
        },
        nameAr: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            required: true,
            enum: ['base_unit', 'sub_unit', 'measurement'],
        },
        description: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

unitSchema.index({ type: 1 });
// unitSchema.index({ code: 1 }); // Redundant since unique: true is in the field definition

const Unit = models.Unit || model<IUnit>('Unit', unitSchema);

export default Unit;
