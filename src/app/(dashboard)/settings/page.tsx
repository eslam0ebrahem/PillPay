'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    Button,
    Card,
    Divider,
    Form,
    InputNumber,
    Space,
    Typography,
    Upload,
    App,
    Flex,
    Alert,
    Popconfirm,
    Col,
    Row,
} from 'antd';
import { 
    DownloadOutlined, 
    UploadOutlined, 
    SettingOutlined, 
    CloudSyncOutlined,
    WarningOutlined,
    SaveOutlined
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

const { Text, Title } = Typography;

// --- Interfaces ---
interface SettingsResponse {
    data: {
        expiringSoonDays: number;
        defaultLowStockThreshold: number;
        maxDiscountPercentage: number;
    };
}

interface SettingsFormValues {
    expiringSoonDays: number;
    defaultLowStockThreshold: number;
    maxDiscountPercentageDisplay: number;
}

export default function SettingsPage() {
    const { message } = App.useApp();
    const [form] = Form.useForm<SettingsFormValues>();
    const [importFile, setImportFile] = useState<File | null>(null);

    // --- Queries ---
    const settingsQuery = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const response = await fetch('/api/settings');
            if (!response.ok) throw new Error('تعذر تحميل الإعدادات');
            return (await response.json()) as SettingsResponse;
        },
    });

    useEffect(() => {
        if (!settingsQuery.data?.data) return;
        form.setFieldsValue({
            expiringSoonDays: settingsQuery.data.data.expiringSoonDays,
            defaultLowStockThreshold: settingsQuery.data.data.defaultLowStockThreshold,
            maxDiscountPercentageDisplay: settingsQuery.data.data.maxDiscountPercentage / 100,
        });
    }, [form, settingsQuery.data]);

    // --- Mutations ---
    const saveSettingsMutation = useMutation({
        mutationFn: async (values: SettingsFormValues) => {
            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expiringSoonDays: values.expiringSoonDays,
                    defaultLowStockThreshold: values.defaultLowStockThreshold,
                    maxDiscountPercentage: Math.round(values.maxDiscountPercentageDisplay * 100),
                }),
            });
            if (!response.ok) throw new Error('تعذر حفظ الإعدادات');
            return response.json();
        },
        onSuccess: () => {
            message.success('تم تحديث إعدادات النظام بنجاح');
            settingsQuery.refetch();
        },
    });

    const exportBackupMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/backup/export', { method: 'POST' });
            if (!response.ok) throw new Error('تعذر تصدير النسخة الاحتياطية');
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pillpay-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
        },
        onSuccess: () => message.success('تم تحميل ملف النسخة الاحتياطية بنجاح'),
    });

    const importBackupMutation = useMutation({
        mutationFn: async () => {
            if (!importFile) throw new Error('يرجى اختيار ملف أولاً');
            const formData = new FormData();
            formData.append('file', importFile);
            const response = await fetch('/api/backup/import', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('فشل استيراد البيانات');
            return response.json();
        },
        onSuccess: (data) => {
            message.success(`تم الاستيراد بنجاح: ${data.data.importedCollections} سجل`);
            setImportFile(null);
            settingsQuery.refetch();
        },
    });

    return (
        <Flex vertical gap={24} style={{ paddingBottom: 40 }}>
            <PageHeader 
                title="إعدادات النظام" 
                subtitle="تحكم في معايير التنبيهات، سياسات الخصم، والنسخ الاحتياطي للبيانات"
            />

            <div style={{ maxWidth: 800, width: '100%', margin: '0 auto' }}>
                <Space direction="vertical" size={24} style={{ width: '100%' }}>
                    
                    {/* --- Section 1: Business Logic --- */}
                    <Card 
                        title={<Space><SettingOutlined /> إعدادات التشغيل</Space>}
                        variant="borderless"
                        loading={settingsQuery.isLoading}
                        style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                    >
                        <Form<SettingsFormValues>
                            form={form}
                            layout="vertical"
                            onFinish={(v) => saveSettingsMutation.mutate(v)}
                        >
                            <Row gutter={24}>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        name="expiringSoonDays"
                                        label="تنبيه الصلاحية (أيام)"
                                        rules={[{ required: true }]}
                                        extra="سيتم تمييز الأدوية التي تنتهي صلاحيتها خلال هذه المدة"
                                    >
                                        <InputNumber min={1} style={{ width: '100%' }} size="large" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        name="defaultLowStockThreshold"
                                        label="حد النقص الافتراضي"
                                        rules={[{ required: true }]}
                                        extra="التنبيه عند وصول رصيد الصنف لهذا الرقم"
                                    >
                                        <InputNumber min={0} style={{ width: '100%' }} size="large" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24}>
                                    <Form.Item label="أقصى نسبة خصم مسموحة" required>
                                        <Flex gap={0}>
                                            <Form.Item name="maxDiscountPercentageDisplay" noStyle>
                                                <InputNumber 
                                                    min={0} max={100} step={0.5} size="large"
                                                    style={{ width: '100%', borderRadius: '0 8px 8px 0' }} 
                                                />
                                            </Form.Item>
                                            <span style={{ 
                                                display: 'flex', alignItems: 'center', padding: '0 16px', 
                                                background: '#f5f5f5', border: '1px solid #d9d9d9',
                                                borderRight: 0, borderRadius: '8px 0 0 8px' 
                                            }}>%</span>
                                        </Flex>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                icon={<SaveOutlined />} 
                                loading={saveSettingsMutation.isPending}
                                size="large"
                                style={{ borderRadius: 8 }}
                            >
                                حفظ التغييرات
                            </Button>
                        </Form>
                    </Card>

                    {/* --- Section 2: Backup & Restore --- */}
                    <Card 
                        title={<Space><CloudSyncOutlined /> النسخ الاحتياطي والأمان</Space>}
                        variant="borderless"
                        style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                    >
                        <Alert
                            message="تحذير أمني"
                            description="عملية الاستيراد ستقوم باستبدال البيانات الحالية. تأكد من امتلاك نسخة حديثة قبل البدء."
                            type="warning"
                            showIcon
                            icon={<WarningOutlined />}
                            style={{ marginBottom: 24, borderRadius: 8 }}
                        />

                        <Flex vertical gap={24}>
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>تصدير البيانات</Text>
                                <Button
                                    icon={<DownloadOutlined />}
                                    loading={exportBackupMutation.isPending}
                                    onClick={() => exportBackupMutation.mutate()}
                                    size="large"
                                >
                                    تحميل نسخة احتياطية (JSON)
                                </Button>
                            </div>

                            <Divider style={{ margin: 0 }} />

                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 12 }}>استيراد البيانات</Text>
                                <Flex vertical gap={12}>
                                    <Upload
                                        maxCount={1}
                                        beforeUpload={(file) => { setImportFile(file); return false; }}
                                        onRemove={() => setImportFile(null)}
                                        fileList={importFile ? [importFile as any] : []}
                                    >
                                        <Button icon={<UploadOutlined />} size="large" block>
                                            {importFile ? 'تغيير الملف المختاري' : 'اختر ملف النسخة الاحتياطية'}
                                        </Button>
                                    </Upload>
                                    
                                    <Popconfirm
                                        title="تأكيد الاستيراد"
                                        description="هل أنت متأكد؟ سيتم حذف البيانات الحالية واستبدالها بالنسخة المرفوعة."
                                        onConfirm={() => importBackupMutation.mutate()}
                                        okText="نعم، استورد البيانات"
                                        cancelText="إلغاء"
                                        okButtonProps={{ danger: true, size: 'large' }}
                                    >
                                        <Button
                                            type="primary"
                                            danger
                                            block
                                            size="large"
                                            disabled={!importFile}
                                            loading={importBackupMutation.isPending}
                                            style={{ borderRadius: 8 }}
                                        >
                                            بدء استيراد النسخة الاحتياطية
                                        </Button>
                                    </Popconfirm>
                                </Flex>
                            </div>
                        </Flex>
                    </Card>
                </Space>
            </div>
        </Flex>
    );
}