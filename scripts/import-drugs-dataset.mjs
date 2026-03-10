import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

function loadEnvFile(filePath) {
    if (!existsSync(filePath)) {
        return;
    }

    const content = readFileSync(filePath, 'utf8');

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1);

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
}

function cleanString(value) {
    if (value === null || value === undefined) {
        return undefined;
    }

    const normalized = String(value)
        .replace(/\s+/g, ' ')
        .replace(/\s*\n\s*/g, ' ')
        .trim();

    return normalized || undefined;
}

function normalizeText(value) {
    return cleanString(value)?.replace(/\s*--\s*/g, ' - ');
}

function normalizeBarcode(value) {
    const barcode = cleanString(value);
    return barcode || null;
}

function toPiasters(value) {
    const price = Number.parseFloat(String(value ?? '').trim());
    if (!Number.isFinite(price) || price <= 0) {
        return null;
    }

    return Math.round(price * 100);
}

function deriveBaseUnit(dosageForm) {
    const key = cleanString(dosageForm)?.toLowerCase();
    const map = {
        tablet: 'قرص',
        capsule: 'كبسولة',
        cream: 'أنبوبة',
        gel: 'أنبوبة',
        ointment: 'أنبوبة',
        syrup: 'زجاجة',
        suspension: 'زجاجة',
        'oral drops': 'قطارة',
        'eye drops': 'قطرة',
        'ear drops': 'قطرة',
        'nasal drops': 'قطرة',
        lotion: 'عبوة',
        spray: 'عبوة',
        shampoo: 'عبوة',
        bottle: 'زجاجة',
        suppository: 'لبوسة',
        solution: 'زجاجة',
        powder: 'عبوة',
        sachet: 'كيس',
        vial: 'فيال',
        ampoule: 'أمبول',
        piece: 'قطعة',
        pen: 'قلم',
        syringe: 'سرنجة',
        soap: 'قطعة',
        serum: 'عبوة',
        'mouth wash': 'زجاجة',
        film: 'شريط',
        oil: 'زجاجة',
        'vaginal douche': 'عبوة',
    };

    return map[key] || 'عبوة';
}

function isPlaceholderName(nameAr, nameEn) {
    const placeholderArabic = new Set(['ششش', 'تجربة']);
    const placeholderEnglish = new Set(['aaa', 'test']);

    return (
        placeholderArabic.has((nameAr || '').toLowerCase()) ||
        placeholderEnglish.has((nameEn || '').toLowerCase())
    );
}

function normalizeCategory(sourceDescription) {
    return cleanString(sourceDescription);
}

function normalizeImageUrl(sourceImage) {
    const imageUrl = cleanString(sourceImage);
    if (!imageUrl) {
        return undefined;
    }

    if (/^https?:\/\//i.test(imageUrl)) {
        return imageUrl;
    }

    return undefined;
}

function buildUpsertKey(product) {
    if (product.barcode) {
        return `barcode:${product.barcode}`;
    }

    if (product.nameEn) {
        return `nameEn:${product.nameEn.toLowerCase()}`;
    }

    return `nameAr:${product.nameAr}`;
}

function buildFilter(product) {
    if (product.barcode) {
        return { barcode: product.barcode };
    }

    if (product.nameEn) {
        return { nameEn: product.nameEn };
    }

    return { nameAr: product.nameAr };
}

function completenessScore(product) {
    const fields = [
        product.barcode,
        product.nameAr,
        product.nameEn,
        product.manufacturer,
        product.category,
        product.activeIngredient,
        product.dosageForm,
        product.route,
        product.uses,
        product.pharmacology,
        product.imageUrl,
    ];

    return fields.filter(Boolean).length;
}

function compactProduct(product) {
    return Object.fromEntries(
        Object.entries(product).filter(([, value]) => value !== undefined && value !== null)
    );
}

function mapDrugItem(item) {
    const nameAr = cleanString(item.arabic) || cleanString(item.name);
    const nameEn = cleanString(item.name);
    const sellingPrice = toPiasters(item.price);

    if (!nameAr || !nameEn || !sellingPrice) {
        return null;
    }

    if (isPlaceholderName(nameAr, nameEn)) {
        return null;
    }

        return compactProduct({
        barcode: normalizeBarcode(item.barcode),
        nameAr,
        nameEn,
        imageUrl: normalizeImageUrl(item.img),
        manufacturer: cleanString(item.company),
        category: normalizeCategory(item.description),
        activeIngredient: cleanString(item.active),
        dosageForm: cleanString(item.dosage_form),
        route: cleanString(item.route),
        uses: normalizeText(item.uses),
        pharmacology: normalizeText(item.pharmacology),
        sellingPrice,
        baseUnit: deriveBaseUnit(item.dosage_form),
        subUnit: null,
        subUnitConversionFactor: null,
        lowStockThreshold: 10,
        isActive: true,
        });
}

function parseArgs(argv) {
    const options = {
        file: 'drugsDataset.json',
        dryRun: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--file' && argv[index + 1]) {
            options.file = argv[index + 1];
            index += 1;
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        }
    }

    return options;
}

async function main() {
    const repoRoot = process.cwd();
    loadEnvFile(path.join(repoRoot, '.env.local'));

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI is missing. Define it in .env.local before importing.');
    }

    const { file, dryRun } = parseArgs(process.argv.slice(2));
    const datasetPath = path.resolve(repoRoot, file);

    if (!existsSync(datasetPath)) {
        throw new Error(`Dataset file not found: ${datasetPath}`);
    }

    const rawData = JSON.parse(readFileSync(datasetPath, 'utf8'));
    const dataset = Array.isArray(rawData) ? rawData : Object.values(rawData);

    const counters = {
        total: dataset.length,
        skippedInvalid: 0,
        collapsedDuplicates: 0,
    };

    const dedupedProducts = new Map();

    for (const item of dataset) {
        const mapped = mapDrugItem(item);
        if (!mapped) {
            counters.skippedInvalid += 1;
            continue;
        }

        const key = buildUpsertKey(mapped);
        const existing = dedupedProducts.get(key);

        if (!existing) {
            dedupedProducts.set(key, mapped);
            continue;
        }

        counters.collapsedDuplicates += 1;
        if (completenessScore(mapped) > completenessScore(existing)) {
            dedupedProducts.set(key, mapped);
        }
    }

    const products = Array.from(dedupedProducts.values());

    console.log(
        JSON.stringify(
            {
                datasetRecords: counters.total,
                normalizedProducts: products.length,
                skippedInvalid: counters.skippedInvalid,
                collapsedDuplicates: counters.collapsedDuplicates,
                dryRun,
            },
            null,
            2
        )
    );

    if (dryRun) {
        return;
    }

    await mongoose.connect(mongoUri, {
        bufferCommands: false,
    });

    try {
        const collection = mongoose.connection.collection('products');
        const now = new Date();

        const operations = products.map((product) => ({
            updateOne: {
                filter: buildFilter(product),
                update: {
                    $set: {
                        ...product,
                        updatedAt: now,
                    },
                    $setOnInsert: {
                        createdAt: now,
                    },
                },
                upsert: true,
            },
        }));

        const result = await collection.bulkWrite(operations, { ordered: false });

        console.log(
            JSON.stringify(
                {
                    matched: result.matchedCount,
                    modified: result.modifiedCount,
                    upserted: result.upsertedCount,
                },
                null,
                2
            )
        );
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
