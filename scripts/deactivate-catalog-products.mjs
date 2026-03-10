/**
 * One-time migration: set isActive = false for products that have never had stock (no batches).
 * These are catalog-only items from the drug dataset import.
 *
 * Usage:
 *   node scripts/deactivate-catalog-products.mjs [--dry-run]
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Env loader (same as import script)
// ---------------------------------------------------------------------------
function loadEnvFile(filePath) {
    if (!existsSync(filePath)) return;
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const sep = trimmed.indexOf('=');
        if (sep === -1) continue;
        const key = trimmed.slice(0, sep).trim();
        let value = trimmed.slice(sep + 1);
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    const repoRoot = process.cwd();
    loadEnvFile(path.join(repoRoot, '.env.local'));

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI is missing. Define it in .env.local.');
    }

    const dryRun = process.argv.includes('--dry-run');

    await mongoose.connect(mongoUri, { bufferCommands: false });

    try {
        const db = mongoose.connection;
        const productsCol = db.collection('products');
        const batchesCol = db.collection('batches');

        // Find all product IDs that have at least one batch
        const productsWithBatches = await batchesCol.distinct('productId');
        const withBatchSet = new Set(productsWithBatches.map((id) => id.toString()));

        console.log(`Products with batches: ${withBatchSet.size}`);

        // Find all currently active products
        const activeProducts = await productsCol
            .find({ isActive: true }, { projection: { _id: 1, nameAr: 1 } })
            .toArray();

        console.log(`Total active products: ${activeProducts.length}`);

        // Filter to those without any batches (catalog-only)
        const toDeactivate = activeProducts.filter(
            (p) => !withBatchSet.has(p._id.toString())
        );

        console.log(`Products to deactivate (no batches): ${toDeactivate.length}`);
        console.log(`Products to keep active (have batches): ${activeProducts.length - toDeactivate.length}`);

        if (toDeactivate.length === 0) {
            console.log('\nNothing to do.');
            return;
        }

        // Show sample
        console.log('\n--- Sample products to deactivate ---');
        for (const p of toDeactivate.slice(0, 5)) {
            console.log(`  - ${p.nameAr}`);
        }
        if (toDeactivate.length > 5) {
            console.log(`  ... and ${toDeactivate.length - 5} more`);
        }

        if (dryRun) {
            console.log('\nDry run complete. No changes made.');
            return;
        }

        const ids = toDeactivate.map((p) => p._id);
        const result = await productsCol.updateMany(
            { _id: { $in: ids } },
            { $set: { isActive: false } }
        );

        console.log(`\nDeactivated ${result.modifiedCount} catalog-only products.`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
