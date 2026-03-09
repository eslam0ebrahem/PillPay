export const dynamic = 'force-dynamic';

import { Typography, Card, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ProductList from '@/components/products/ProductList';
import ar from '@/i18n/ar';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';

const { Title } = Typography;

export default async function ProductsPage() {
    await connectDB();

    // Fetch products
    const products = await Product.find().sort({ nameAr: 1 }).lean<any[]>();

    // Calculate aggregated stock for display
    const stockAgg = await Batch.aggregate([
        {
            $group: {
                _id: '$productId',
                totalQty: { $sum: { $add: ['$warehouseQty', '$floorQty'] } },
            },
        },
    ]);

    const stockMap = new Map(stockAgg.map((s) => [s._id.toString(), s.totalQty]));

    const data = products.map((p) => ({
        ...p,
        _id: p._id.toString(),
        totalQty: stockMap.get(p._id.toString()) || 0,
    }));

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    {ar.products.title}
                </Title>
                <Link href="/products/new">
                    <Button type="primary" icon={<PlusOutlined />}>
                        {ar.products.addProduct}
                    </Button>
                </Link>
            </div>

            <Card>
                <ProductList
                    data={data}
                    loading={false}
                    pagination={{ pageSize: 20 }}
                    onTableChange={() => { }}
                    onSearch={() => { }}
                />
            </Card>
        </div>
    );
}
