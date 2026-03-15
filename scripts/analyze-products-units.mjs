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

async function analyzeUnits() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) throw new Error('MONGODB_URI not found');

        await mongoose.connect(mongoUri);
        const db = mongoose.connection.db;

        const baseUnits = await db.collection('products').aggregate([
            { $group: { _id: "$baseUnit", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        console.log("=== Base Units Usage ===");
        baseUnits.forEach(u => console.log(`${u._id}: ${u.count}`));

        const subUnits = await db.collection('products').aggregate([
            { $group: { _id: "$subUnit", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        console.log("\n=== Sub Units Usage ===");
        subUnits.forEach(u => console.log(`${u._id}: ${u.count}`));

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

analyzeUnits();
