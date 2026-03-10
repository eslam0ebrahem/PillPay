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

const productSchema = new mongoose.Schema({
    nameAr: String,
    baseUnit: String,
    subUnit: String,
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const Unit = mongoose.models.Unit || mongoose.model('Unit', new mongoose.Schema({
    nameAr: String,
    type: String,
}));

// Basic mapping dictionary for known variants and misspellings in Arabic
const unitMap = {
    'علبه': 'علبة',
    'عبوه': 'عبوة',
    'شريط': 'شريط',
    'امبول': 'أمبول',
    'قرص': 'قرص',
    'زجاجه': 'زجاجة',
    'كبسوله': 'كبسولة',
    'برطمان': 'برطمان',
    'كيس': 'كيس',
    'قطره': 'قطرة',
    'انبوبه': 'أنبوبة',
    'فيال': 'فيال',
    'لبوس': 'لبوس / قمع',
    'قمع': 'لبوس / قمع',
    'بخاخه': 'بخاخة',
    'سرنجه': 'سرنجة',
    'قطعه': 'قطعة',
    'ج': 'جرام',
    'مل': 'ملي',
    'أنبوب': 'أنبوبة',
    'كارد': 'كارت'
};

function standardizeName(name) {
    if (!name) return null;
    const trimmed = name.trim();
    if (unitMap[trimmed]) return unitMap[trimmed];
    return trimmed;
}

async function migrateUnits() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) throw new Error('MONGODB_URI is not defined in .env.local');

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const products = await Product.find({}).lean();
        console.log(`Found ${products.length} products to check...`);

        let updatedCount = 0;

        for (const product of products) {
            let needsUpdate = false;
            let updates = {};

            const standardBase = standardizeName(product.baseUnit);
            if (standardBase && standardBase !== product.baseUnit) {
                updates.baseUnit = standardBase;
                needsUpdate = true;
            }

            const standardSub = standardizeName(product.subUnit);
            if (standardSub && standardSub !== product.subUnit) {
                updates.subUnit = standardSub;
                needsUpdate = true;
            }

            if (needsUpdate) {
                await Product.updateOne({ _id: product._id }, { $set: updates });
                updatedCount++;
            }
        }

        console.log(`✅ Migration complete. Updated ${updatedCount} products.`);
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

migrateUnits();
