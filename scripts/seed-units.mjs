import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=:]+?)\s*=\s*(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim().replace(/(^"|"$)/g, '').replace(/(^'|'$)/g, '');
        }
    });
}

// Define a minimal Unit schema for seeding without needing the Next.js environment
const unitSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true },
        nameEn: { type: String, required: true },
        nameAr: { type: String, required: true },
        type: { type: String, required: true, enum: ['base_unit', 'sub_unit', 'measurement'] },
        description: { type: String },
    },
    { timestamps: true }
);

const Unit = mongoose.models.Unit || mongoose.model('Unit', unitSchema);

const pharmacy_units = {
    base_units: [
        { code: "box", nameEn: "Box", nameAr: "علبة", description: "Standard full packaging for most medications.", type: "base_unit" },
        { code: "bottle", nameEn: "Bottle", nameAr: "زجاجة", description: "Used for syrups, suspensions, and liquid medicines.", type: "base_unit" },
        { code: "pack", nameEn: "Pack", nameAr: "عبوة", description: "General packaging for supplies like cotton or medical alcohol.", type: "base_unit" },
        { code: "jar", nameEn: "Jar", nameAr: "برطمان", description: "Used for bulk creams, powders, or supplements.", type: "base_unit" }
    ],
    sub_units: [
        { code: "strip", nameEn: "Strip / Blister", nameAr: "شريط", description: "Subunit of a box, very common in Egyptian retail.", type: "sub_unit" },
        { code: "tablet", nameEn: "Tablet", nameAr: "قرص", description: "Individual pill from a strip.", type: "sub_unit" },
        { code: "capsule", nameEn: "Capsule", nameAr: "كبسولة", description: "Individual capsule from a strip.", type: "sub_unit" },
        { code: "ampoule", nameEn: "Ampoule", nameAr: "أمبول", description: "Glass vial containing a single dose of liquid for injection.", type: "sub_unit" },
        { code: "vial", nameEn: "Vial", nameAr: "فيال", description: "Small bottle containing medicine in powder or liquid form (e.g., antibiotics).", type: "sub_unit" },
        { code: "sachet", nameEn: "Sachet", nameAr: "كيس", description: "Used for effervescent powders like 'Fawwar' or granules.", type: "sub_unit" },
        { code: "suppository", nameEn: "Suppository", nameAr: "لبوس / قمع", description: "Common Egyptian term for rectal/vaginal suppositories.", type: "sub_unit" },
        { code: "tube", nameEn: "Tube", nameAr: "أنبوبة", description: "Used for ointments, creams, and gels.", type: "sub_unit" },
        { code: "drops", nameEn: "Drops", nameAr: "قطرة", description: "Eye, ear, or oral drops.", type: "sub_unit" },
        { code: "spray", nameEn: "Spray / Inhaler", nameAr: "بخاخة", description: "Nasal sprays or asthma inhalers.", type: "sub_unit" },
        { code: "pen", nameEn: "Pen", nameAr: "قلم", description: "Pre-filled insulin or weight-loss pens.", type: "sub_unit" },
        { code: "syringe", nameEn: "Syringe", nameAr: "سرنجة", description: "Medical supply sold individually.", type: "sub_unit" },
        { code: "card", nameEn: "Card", nameAr: "كارت", description: "Used for items packaged on a cardboard backing.", type: "sub_unit" },
        { code: "piece", nameEn: "Piece / Each", nameAr: "قطعة", description: "Generic fallback unit for single items.", type: "sub_unit" }
    ],
    measurements: [
        { code: "ml", nameEn: "Milliliter", nameAr: "ملي", description: "Volume measurement for liquids.", type: "measurement" },
        { code: "mg", nameEn: "Milligram", nameAr: "مليجرام", description: "Weight measurement for active ingredients.", type: "measurement" },
        { code: "gm", nameEn: "Gram", nameAr: "جرام", description: "Weight measurement for creams or powders.", type: "measurement" }
    ]
};

async function seedUnits() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) throw new Error('MONGODB_URI is not defined in .env.local');

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const allUnits = [
            ...pharmacy_units.base_units,
            ...pharmacy_units.sub_units,
            ...pharmacy_units.measurements
        ];

        let insertedCount = 0;
        let updatedCount = 0;

        for (const unit of allUnits) {
            const existing = await Unit.findOne({ code: unit.code });
            if (existing) {
                await Unit.updateOne({ code: unit.code }, { $set: unit });
                updatedCount++;
            } else {
                await Unit.create(unit);
                insertedCount++;
            }
        }

        console.log(`✅ Seeding complete. Inserted: ${insertedCount}, Updated: ${updatedCount}`);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

seedUnits();
