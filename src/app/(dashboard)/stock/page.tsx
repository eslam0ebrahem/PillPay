export const dynamic = 'force-dynamic';

import { Typography, Row, Col, Card, Statistic, Alert } from 'antd';
import { WarningOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';
import StockManagerClient from '@/components/stock/StockManagerClient';
import ar from '@/i18n/ar';
import dayjs from 'dayjs';

const { Title } = Typography;

export default async function StockPage() {
    await connectDB();

    const now = dayjs();
    const thirtyDaysFromNow = dayjs().add(30, 'day').toDate();

    // Find all products and batches
    const products = await Product.find({ isActive: true }).lean<any[]>();
    const batches = await Batch.find().populate('productId', 'nameAr nameEn baseUnit lowStockThreshold').lean<any[]>();

    const expiredBatches: any[] = [];
    const expiringSoonBatches: any[] = [];
    const lowStockProducts: any[] = [];
    const outOfStockProducts: any[] = [];

    // Process batches for expiration
    batches.forEach(b => {
        const exp = dayjs(b.expirationDate);
        if (exp.isBefore(now)) {
            if (b.floorQty > 0 || b.warehouseQty > 0) expiredBatches.push(b);
        } else if (exp.isBefore(thirtyDaysFromNow)) {
            if (b.floorQty > 0 || b.warehouseQty > 0) expiringSoonBatches.push(b);
        }
    });

    // Process products for stock
    products.forEach(p => {
        const pBatches = batches.filter(b => b.productId?._id?.toString() === p._id.toString());
        const totalQty = pBatches.reduce((acc, b) => acc + b.floorQty + b.warehouseQty, 0);

        if (totalQty === 0) {
            outOfStockProducts.push({ ...p, totalQty });
        } else if (totalQty <= (p.lowStockThreshold || 0)) {
            lowStockProducts.push({ ...p, totalQty });
        }
    });

    // Make batch data safe for client
    const safeBatches = batches.map(b => ({
        ...b,
        _id: b._id.toString(),
        productId: {
            ...b.productId,
            _id: b.productId._id.toString()
        },
        supplierInvoiceId: b.supplierInvoiceId ? b.supplierInvoiceId.toString() : null
    }));

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>
                {ar.nav.stock}
            </Title>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic title="منتجات نفذت" value={outOfStockProducts.length} valueStyle={{ color: '#cf1322' }} prefix={<WarningOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic title="المخزون المنخفض" value={lowStockProducts.length} valueStyle={{ color: '#d48806' }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic title="منتهية الصلاحية" value={expiredBatches.length} valueStyle={{ color: '#cf1322' }} prefix={<ExclamationCircleOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic title="تقارب الانتهاء (30 يوم)" value={expiringSoonBatches.length} valueStyle={{ color: '#d48806' }} />
                    </Card>
                </Col>
            </Row>

            {outOfStockProducts.length > 0 && (
                <Alert
                    message={`يوجد ${outOfStockProducts.length} منتجات نفذت من المخزون`}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            <StockManagerClient safeBatches={safeBatches} products={products.map(p => ({ ...p, _id: p._id.toString() }))} />
        </div>
    );
}
