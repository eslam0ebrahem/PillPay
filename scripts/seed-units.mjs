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
        { code: "box", nameEn: "Box", nameAr: "علبة", type: "base_unit", description: "العبوة الكاملة أو القياسية لمعظم الأدوية." },
        { code: "bottle", nameEn: "Bottle", nameAr: "زجاجة", type: "base_unit", description: "تستخدم للأدوية الشرب، المعلقات، والأدوية السائلة." },
        { code: "pack", nameEn: "Pack", nameAr: "عبوة", type: "base_unit", description: "تغليف عام للمستلزمات الطبية مثل القطن أو الكحول." },
        { code: "jar", nameEn: "Jar", nameAr: "برطمان", type: "base_unit", description: "يستخدم للكميات الكبيرة من الكريمات، البودرة، أو المكملات الغذائية." }
    ],
    sub_units: [
        { code: "strip", nameEn: "Strip / Blister", nameAr: "شريط", type: "sub_unit", description: "جزء من العلبة، شائع جداً في البيع بالتجزئة في الصيدليات المصرية." },
        { code: "tablet", nameEn: "Tablet", nameAr: "قرص", type: "sub_unit", description: "حبة أو قرص مفرد من الشريط." },
        { code: "capsule", nameEn: "Capsule", nameAr: "كبسولة", type: "sub_unit", description: "كبسولة مفردة من الشريط." },
        { code: "ampoule", nameEn: "Ampoule", nameAr: "أمبول", type: "sub_unit", description: "زجاجة صغيرة تحتوي على جرعة واحدة من السائل للحقن." },
        { code: "vial", nameEn: "Vial", nameAr: "فيال", type: "sub_unit", description: "زجاجة صغيرة تحتوي على الدواء في شكل بودرة أو سائل (مثل حقن المضادات الحيوية)." },
        { code: "sachet", nameEn: "Sachet", nameAr: "كيس", type: "sub_unit", description: "تستخدم لأكياس الفوار أو الحبيبات." },
        { code: "suppository", nameEn: "Suppository", nameAr: "لبوس / قمع", type: "sub_unit", description: "المصطلح الشائع للأقماع الشرجية أو المهبلية." },
        { code: "tube", nameEn: "Tube", nameAr: "أنبوبة", type: "sub_unit", description: "تستخدم للمراهم، الكريمات، والجل." },
        { code: "drops", nameEn: "Drops", nameAr: "قطرة", type: "sub_unit", description: "قطرات العين، الأذن، أو الفم." },
        { code: "spray", nameEn: "Spray / Inhaler", nameAr: "بخاخة", type: "sub_unit", description: "بخاخات الأنف أو بخاخات الربو." },
        { code: "pen", nameEn: "Pen", nameAr: "قلم", type: "sub_unit", description: "أقلام الإنسولين أو التخسيس المعبأة مسبقاً." },
        { code: "syringe", nameEn: "Syringe", nameAr: "سرنجة", type: "sub_unit", description: "مستلزم طبي (سرنجة) يباع بالقطعة." },
        { code: "card", nameEn: "Card", nameAr: "كارت", type: "sub_unit", description: "تستخدم للمنتجات المغلفة على كارت مقوى." },
        { code: "piece", nameEn: "Piece / Each", nameAr: "قطعة", type: "sub_unit", description: "وحدة عامة للأشياء التي تباع بالقطعة المفردة (مثل كمامة واحدة، تيتينة)." }
    ],
    measurements: [
        { code: "ml", nameEn: "Milliliter", nameAr: "ملي", type: "measurement", description: "وحدة قياس الحجم للسوائل." },
        { code: "mg", nameEn: "Milligram", nameAr: "مليجرام", type: "measurement", description: "وحدة قياس الوزن للمواد الفعالة." },
        { code: "gm", nameEn: "Gram", nameAr: "جرام", type: "measurement", description: "وحدة قياس الوزن للكريمات أو البودرة." }
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
