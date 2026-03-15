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

const baseMapping = {
    'قطعة': 'عبوة',
    'أنبوبة': 'علبة',
    'كيس': 'علبة',
    'كارت': 'عبوة',
    'شريط': 'علبة',
    'أمبول': 'علبة',
    'كبسولة': 'علبة',
    'فيال': 'علبة',
    'قطرة': 'علبة',
    'بخاخة': 'علبة',
    'قلم': 'علبة',
    'سرنجة': 'عبوة',
    'درمة': 'علبة'
};

const VALID_BASES = ['علبة', 'زجاجة', 'عبوة', 'برطمان'];

async function migrate() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) throw new Error('MONGODB_URI not found');

        await mongoose.connect(mongoUri);
        const db = mongoose.connection.db;
        const productsCol = db.collection('products');

        const products = await productsCol.find({}).toArray();
        console.log(`Analyzing ${products.length} products...`);

        const bulkOps = [];

        for (const product of products) {
            let currentBase = product.baseUnit;
            if (!currentBase) continue;

            // If already valid, skip
            if (VALID_BASES.includes(currentBase)) continue;

            let updates = {};
            let newBase = baseMapping[currentBase] || 'علبة'; // Fallback to 'علبة'

            updates.baseUnit = newBase;

            // If it didn't have a sub-unit, move the old base to sub-unit
            if (!product.subUnit) {
                updates.subUnit = currentBase;
                updates.subUnitConversionFactor = 1;
            }

            bulkOps.push({
                updateOne: {
                    filter: { _id: product._id },
                    update: { $set: updates }
                }
            });
        }

        if (bulkOps.length > 0) {
            console.log(`Executing ${bulkOps.length} updates in bulk...`);
            const result = await productsCol.bulkWrite(bulkOps);
            console.log(`✅ Migration successful. Modified ${result.modifiedCount} products.`);
        } else {
            console.log("No products needed updating.");
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
