import mongoose from 'mongoose';
import process from 'process';
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
    baseUnit: String,
    subUnit: String,
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function analyzeUnits() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find({}).lean();
        
        const baseUnits = {};
        const subUnits = {};
        
        products.forEach(p => {
            if (p.baseUnit) baseUnits[p.baseUnit] = (baseUnits[p.baseUnit] || 0) + 1;
            if (p.subUnit) subUnits[p.subUnit] = (subUnits[p.subUnit] || 0) + 1;
        });
        
        console.log('=== BASE UNITS ===');
        Object.entries(baseUnits).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`${k}: ${v}`));
        
        console.log('\n=== SUB UNITS ===');
        Object.entries(subUnits).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`${k}: ${v}`));
        
    } finally {
        await mongoose.disconnect();
    }
}

analyzeUnits();
