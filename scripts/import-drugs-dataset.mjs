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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cleanString(value) {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).replace(/\s+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();
    return normalized || undefined;
}

function normalizeBarcode(value) {
    return cleanString(value) || null;
}

function toPiasters(value) {
    const price = Number.parseFloat(String(value ?? '').trim());
    if (!Number.isFinite(price) || price < 0) return null;
    return Math.round(price * 100);
}

function normalizeImageUrl(images) {
    if (!Array.isArray(images) || images.length === 0) return undefined;
    const main = images.find((i) => i.type === 'MAIN') || images[0];
    const url = cleanString(main?.url);
    if (!url) return undefined;
    return /^https?:\/\//i.test(url) ? url : undefined;
}

/**
 * Normalize unit name from the dataset.
 * The dataset uses mixed Arabic/English names; standardize to Arabic.
 */
function normalizeUnitName(name) {
    if (!name) return 'قطعة';
    const ar = cleanString(name.ar);
    const en = cleanString(name.en)?.toLowerCase();

    // If Arabic name is already good, use it
    if (ar && ar !== 'Each') return ar;

    // Map English fallbacks to Arabic
    const map = {
        piece: 'قطعة',
        each: 'قطعة',
        strip: 'شريط',
        tube: 'أنبوب',
        sachet: 'كيس',
        card: 'كارد',
        ampoule: 'أمبول',
        bottle: 'زجاجة',
    };

    return map[en] || ar || 'قطعة';
}

/**
 * Extract active ingredient from bilingual description if present.
 * Looks for patterns like "Active Ingredient: ..." or "المادة الفعالة: ..."
 */
function extractActiveIngredient(description) {
    if (!description) return undefined;

    const en = cleanString(description.en);
    const ar = cleanString(description.ar);

    // Try English pattern first
    if (en) {
        const match = en.match(/Active\s+Ingredient\s*:\s*(.+?)(?:\s+Treatment|\s+Used|\s*$)/i);
        if (match) return cleanString(match[1]);
    }

    // Try Arabic pattern
    if (ar) {
        const match = ar.match(/الماد[ةه] الفعال[ةه]\s*:\s*(.+?)(?:\s|$)/i);
        if (match) return cleanString(match[1]);
    }

    return undefined;
}

// ---------------------------------------------------------------------------
// Map a single JSONL product to our schema
// ---------------------------------------------------------------------------
function mapProduct(data, lineNumber) {
    const nameAr = cleanString(data.name?.ar);
    const nameEn = cleanString(data.name?.en);
    const sellingPrice = toPiasters(data.price);

    if (!nameAr) {
        return { product: null, error: `Line ${lineNumber}: missing Arabic name` };
    }
    if (sellingPrice === null) {
        return { product: null, error: `Line ${lineNumber}: invalid price (${data.price})` };
    }

    // Units mapping
    const units = data.units || [];
    const defaultUnit = units.find((u) => u.isDefault) || units[0];
    const secondaryUnit = units.find((u) => !u.isDefault);

    const baseUnit = normalizeUnitName(defaultUnit?.name);
    const subUnit = secondaryUnit ? normalizeUnitName(secondaryUnit.name) : null;
    const subUnitConversionFactor =
        secondaryUnit && secondaryUnit.quantity > 1 ? secondaryUnit.quantity : null;

    const product = {
        barcode: normalizeBarcode(data.barcode),
        barcode2: normalizeBarcode(data.barcode2),
        nameAr,
        nameEn: nameEn || undefined,
        imageUrl: normalizeImageUrl(data.images),
        manufacturer: cleanString(data.brand?.name?.en),
        description: cleanString(data.description?.ar),
        descriptionEn: cleanString(data.description?.en),
        activeIngredient: extractActiveIngredient(data.description),
        sellingPrice,
        baseUnit,
        subUnit,
        subUnitConversionFactor,
        lowStockThreshold: 10,
        isActive: false,
        // Stored for future use
        sourceId: data.id ?? null,
        brandId: data.brand?.id ?? null,
        brandNameAr: cleanString(data.brand?.name?.ar),
        categoryId: data.categoryId ?? null,
        slug: cleanString(data.slug?.en),
    };

    // Remove undefined values
    const compact = Object.fromEntries(
        Object.entries(product).filter(([, v]) => v !== undefined)
    );

    return { product: compact, error: null };
}

// ---------------------------------------------------------------------------
// Read JSONL file line by line (memory efficient)
// ---------------------------------------------------------------------------
async function readJsonlFile(filePath) {
    const products = [];
    const errors = [];
    let lineNumber = 0;

    const rl = createInterface({
        input: createReadStream(filePath, 'utf8'),
        crlfDelay: Infinity,
    });

    for await (const line of rl) {
        lineNumber += 1;
        const trimmed = line.trim();
        if (!trimmed) continue;

        let parsed;
        try {
            parsed = JSON.parse(trimmed);
        } catch {
            errors.push(`Line ${lineNumber}: invalid JSON`);
            continue;
        }

        const data = parsed.data || parsed;
        const { product, error } = mapProduct(data, lineNumber);

        if (error) {
            errors.push(error);
            continue;
        }

        products.push(product);
    }

    return { products, errors, totalLines: lineNumber };
}

// ---------------------------------------------------------------------------
// Deduplication (keep most complete record per barcode)
// ---------------------------------------------------------------------------
function deduplicateProducts(products) {
    const map = new Map();
    let collapsed = 0;

    for (const p of products) {
        // Deduplicate by barcode (primary key for upsert)
        const key = p.barcode || `name:${p.nameAr}`;
        const existing = map.get(key);

        if (!existing) {
            map.set(key, p);
            continue;
        }

        collapsed += 1;
        // Keep the one with more filled fields
        const scoreNew = Object.values(p).filter(Boolean).length;
        const scoreOld = Object.values(existing).filter(Boolean).length;
        if (scoreNew > scoreOld) {
            map.set(key, p);
        }
    }

    return { deduped: Array.from(map.values()), collapsed };
}

// ---------------------------------------------------------------------------
// Build MongoDB upsert filter
// ---------------------------------------------------------------------------
function buildFilter(product) {
    if (product.barcode) return { barcode: product.barcode };
    if (product.nameEn) return { nameEn: product.nameEn };
    return { nameAr: product.nameAr };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
    const options = {
        file: 'dataSet/product_details_20260310_021722.jsonl',
        dryRun: false,
        batchSize: 500,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--file' && argv[i + 1]) {
            options.file = argv[i + 1];
            i += 1;
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg === '--batch-size' && argv[i + 1]) {
            options.batchSize = parseInt(argv[i + 1], 10);
            i += 1;
        }
    }

    return options;
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

    const { file, dryRun, batchSize } = parseArgs(process.argv.slice(2));
    const datasetPath = path.resolve(repoRoot, file);

    if (!existsSync(datasetPath)) {
        throw new Error(`Dataset file not found: ${datasetPath}`);
    }

    console.log(`Reading ${datasetPath}...`);
    const { products: rawProducts, errors, totalLines } = await readJsonlFile(datasetPath);
    const { deduped: products, collapsed } = deduplicateProducts(rawProducts);

    const summary = {
        totalLines,
        validProducts: rawProducts.length,
        skippedInvalid: errors.length,
        collapsedDuplicates: collapsed,
        finalProducts: products.length,
        dryRun,
    };

    console.log('\n--- Import Summary ---');
    console.log(JSON.stringify(summary, null, 2));

    if (errors.length > 0) {
        console.log(`\n--- Errors (${errors.length}) ---`);
        // Show first 20 errors max
        for (const err of errors.slice(0, 20)) {
            console.log(`  ${err}`);
        }
        if (errors.length > 20) {
            console.log(`  ... and ${errors.length - 20} more`);
        }
    }

    if (dryRun) {
        console.log('\nDry run complete. No database changes made.');
        // Print 3 sample products
        console.log('\n--- Sample Products ---');
        for (const p of products.slice(0, 3)) {
            console.log(JSON.stringify(p, null, 2));
        }
        return;
    }

    await mongoose.connect(mongoUri, { bufferCommands: false });

    try {
        const collection = mongoose.connection.collection('products');
        const now = new Date();

        let totalMatched = 0;
        let totalModified = 0;
        let totalUpserted = 0;

        // Process in batches for memory efficiency
        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);

            const operations = batch.map((product) => {
                // Separate isActive so it only applies on insert (new catalog items).
                // Re-running the import must NOT deactivate products already activated by the pharmacy.
                const { isActive, ...rest } = product;
                return {
                    updateOne: {
                        filter: buildFilter(product),
                        update: {
                            $set: { ...rest, updatedAt: now },
                            $setOnInsert: { createdAt: now, isActive: isActive ?? false },
                        },
                        upsert: true,
                    },
                };
            });

            const result = await collection.bulkWrite(operations, { ordered: false });

            totalMatched += result.matchedCount;
            totalModified += result.modifiedCount;
            totalUpserted += result.upsertedCount;

            console.log(
                `  Batch ${Math.floor(i / batchSize) + 1}: ` +
                `matched=${result.matchedCount} modified=${result.modifiedCount} upserted=${result.upsertedCount}`
            );
        }

        console.log('\n--- Database Results ---');
        console.log(JSON.stringify({ totalMatched, totalModified, totalUpserted }, null, 2));
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
