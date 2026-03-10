import { existsSync, readFileSync, createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Env loader
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

function cleanString(value) {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).replace(/\s+/g, ' ').trim();
    return normalized || undefined;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
    const options = {
        productsFile: 'dataSet/product_details_20260310_021722.jsonl',
        brandsFile: 'dataSet/brands_20260310_021722.json',
        categoriesFile: 'dataSet/categories_20260310_021722.json',
        dryRun: false,
        linkProducts: true,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--products-file' && argv[i + 1]) {
            options.productsFile = argv[i + 1];
            i += 1;
        } else if (arg === '--brands-file' && argv[i + 1]) {
            options.brandsFile = argv[i + 1];
            i += 1;
        } else if (arg === '--categories-file' && argv[i + 1]) {
            options.categoriesFile = argv[i + 1];
            i += 1;
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg === '--no-link') {
            options.linkProducts = false;
        }
    }

    return options;
}

// ---------------------------------------------------------------------------
// Extract brands from product JSONL + brands file
// ---------------------------------------------------------------------------
async function extractBrands(productsPath, brandsFilePath) {
    const brands = new Map();

    // 1. Extract from product data (most complete, 1319 brands)
    const rl = createInterface({
        input: createReadStream(productsPath, 'utf8'),
        crlfDelay: Infinity,
    });

    for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            const data = JSON.parse(trimmed).data || JSON.parse(trimmed);
            const b = data.brand;
            if (!b || !b.id) continue;

            if (!brands.has(b.id)) {
                brands.set(b.id, {
                    sourceId: b.id,
                    nameAr: cleanString(b.name?.ar) || cleanString(b.name?.en) || '',
                    nameEn: cleanString(b.name?.en) || cleanString(b.name?.ar) || '',
                    image: cleanString(b.image) || null,
                });
            }
        } catch {
            // skip invalid lines
        }
    }

    // 2. Merge images from brands file (has better image URLs for featured brands)
    if (existsSync(brandsFilePath)) {
        const brandsFileData = JSON.parse(readFileSync(brandsFilePath, 'utf8'));
        const brandsArray = brandsFileData.data || brandsFileData;

        for (const fb of brandsArray) {
            const existing = brands.get(fb.id);
            if (existing) {
                // Brands file has actual image URLs, products usually have null
                if (fb.image && !existing.image) {
                    existing.image = fb.image;
                }
            } else {
                brands.set(fb.id, {
                    sourceId: fb.id,
                    nameAr: cleanString(fb.name?.ar) || '',
                    nameEn: cleanString(fb.name?.en) || '',
                    image: cleanString(fb.image) || null,
                });
            }
        }
    }

    return Array.from(brands.values()).filter((b) => b.nameAr || b.nameEn);
}

// ---------------------------------------------------------------------------
// Extract categories from categories file
// ---------------------------------------------------------------------------
function extractCategories(categoriesFilePath) {
    if (!existsSync(categoriesFilePath)) {
        console.log('Categories file not found, skipping.');
        return [];
    }

    const data = JSON.parse(readFileSync(categoriesFilePath, 'utf8'));
    const categories = data.data || data;

    return categories.map((c) => ({
        sourceId: c.id,
        nameAr: cleanString(c.name?.ar) || '',
        nameEn: cleanString(c.name?.en) || '',
        imageAr: cleanString(c.image?.ar) || null,
        imageEn: cleanString(c.image?.en) || null,
    }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    const repoRoot = process.cwd();
    loadEnvFile(path.join(repoRoot, '.env.local'));

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI is missing. Define it in .env.local before importing.');
    }

    const options = parseArgs(process.argv.slice(2));
    const productsPath = path.resolve(repoRoot, options.productsFile);
    const brandsPath = path.resolve(repoRoot, options.brandsFile);
    const categoriesPath = path.resolve(repoRoot, options.categoriesFile);

    // --- Extract brands ---
    console.log('Extracting brands from product data + brands file...');
    const brands = await extractBrands(productsPath, brandsPath);
    console.log(`  Found ${brands.length} unique brands`);

    // --- Extract categories ---
    console.log('Extracting categories from categories file...');
    const categories = extractCategories(categoriesPath);
    console.log(`  Found ${categories.length} categories`);

    if (options.dryRun) {
        console.log('\n--- Dry Run Summary ---');
        console.log(`Brands to upsert: ${brands.length}`);
        console.log(`Categories to upsert: ${categories.length}`);
        console.log('\nSample brands:');
        for (const b of brands.slice(0, 5)) {
            console.log(`  ${b.sourceId}: ${b.nameEn} (image: ${b.image ? 'yes' : 'no'})`);
        }
        console.log('\nSample categories:');
        for (const c of categories.slice(0, 5)) {
            console.log(`  ${c.sourceId}: ${c.nameEn} (${c.nameAr})`);
        }
        return;
    }

    // --- Database operations ---
    await mongoose.connect(mongoUri, { bufferCommands: false });

    try {
        const now = new Date();

        // --- Upsert brands ---
        console.log('\nUpserting brands...');
        const brandsCol = mongoose.connection.collection('brands');
        const brandOps = brands.map((b) => ({
            updateOne: {
                filter: { sourceId: b.sourceId },
                update: {
                    $set: { ...b, updatedAt: now },
                    $setOnInsert: { createdAt: now, isActive: true },
                },
                upsert: true,
            },
        }));

        const brandResult = await brandsCol.bulkWrite(brandOps, { ordered: false });
        console.log(`  Matched: ${brandResult.matchedCount}, Modified: ${brandResult.modifiedCount}, Upserted: ${brandResult.upsertedCount}`);

        // --- Upsert categories ---
        console.log('\nUpserting categories...');
        const catsCol = mongoose.connection.collection('categories');
        const catOps = categories.map((c) => ({
            updateOne: {
                filter: { sourceId: c.sourceId },
                update: {
                    $set: { ...c, updatedAt: now },
                    $setOnInsert: { createdAt: now, isActive: true },
                },
                upsert: true,
            },
        }));

        if (catOps.length > 0) {
            const catResult = await catsCol.bulkWrite(catOps, { ordered: false });
            console.log(`  Matched: ${catResult.matchedCount}, Modified: ${catResult.modifiedCount}, Upserted: ${catResult.upsertedCount}`);
        }

        // --- Link products to brand ObjectIds ---
        if (options.linkProducts) {
            console.log('\nLinking products to brand documents...');

            // Build sourceId → _id map
            const brandDocs = await brandsCol.find({}, { projection: { sourceId: 1 } }).toArray();
            const brandMap = new Map(brandDocs.map((b) => [b.sourceId, b._id]));

            const productsCol = mongoose.connection.collection('products');

            // Find products with brandId but no brand ObjectId ref
            const unlinked = await productsCol
                .find({ brandId: { $ne: null }, $or: [{ brand: null }, { brand: { $exists: false } }] })
                .project({ _id: 1, brandId: 1 })
                .toArray();

            console.log(`  Products to link: ${unlinked.length}`);

            if (unlinked.length > 0) {
                const linkOps = [];
                let skipped = 0;

                for (const p of unlinked) {
                    const brandObjectId = brandMap.get(p.brandId);
                    if (brandObjectId) {
                        linkOps.push({
                            updateOne: {
                                filter: { _id: p._id },
                                update: { $set: { brand: brandObjectId } },
                            },
                        });
                    } else {
                        skipped += 1;
                    }
                }

                if (linkOps.length > 0) {
                    // Process in batches
                    const batchSize = 500;
                    let totalModified = 0;
                    for (let i = 0; i < linkOps.length; i += batchSize) {
                        const batch = linkOps.slice(i, i + batchSize);
                        const result = await productsCol.bulkWrite(batch, { ordered: false });
                        totalModified += result.modifiedCount;
                    }
                    console.log(`  Linked: ${totalModified}, Skipped (no brand match): ${skipped}`);
                }
            }
        }

        console.log('\nDone!');
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
