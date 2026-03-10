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
} from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

const { Text } = Typography;

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

    const settingsQuery = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const response = await fetch('/api/settings');
            if (!response.ok) {
                throw new Error('تعذر تحميل الإعدادات');
            }

            return (await response.json()) as SettingsResponse;
        },
    });

    useEffect(() => {
        if (!settingsQuery.data?.data) {
            return;
        }

        form.setFieldsValue({
            expiringSoonDays: settingsQuery.data.data.expiringSoonDays,
            defaultLowStockThreshold: settingsQuery.data.data.defaultLowStockThreshold,
            maxDiscountPercentageDisplay:
                settingsQuery.data.data.maxDiscountPercentage / 100,
        });
    }, [form, settingsQuery.data]);

    const saveSettingsMutation = useMutation({
        mutationFn: async (values: SettingsFormValues) => {
            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    expiringSoonDays: values.expiringSoonDays,
                    defaultLowStockThreshold: values.defaultLowStockThreshold,
                    maxDiscountPercentage: Math.round(
                        values.maxDiscountPercentageDisplay * 100
                    ),
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message ?? 'تعذر حفظ الإعدادات');
            }

            return data;
        },
        onSuccess: () => {
            message.success('تم حفظ الإعدادات بنجاح');
            settingsQuery.refetch();
        },
        onError: (error) => {
            message.error(error instanceof Error ? error.message : 'تعذر حفظ الإعدادات');
        },
    });

    const exportBackupMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/backup/export', {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error?.message ?? 'تعذر تصدير النسخة الاحتياطية');
            }

            const disposition = response.headers.get('content-disposition') || '';
            const match = disposition.match(/filename="(.+)"/);
            const fileName = match?.[1] ?? 'pillpay-backup.json';
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        },
        onSuccess: () => {
            message.success('تم تصدير النسخة الاحتياطية');
        },
        onError: (error) => {
            message.error(
                error instanceof Error ? error.message : 'تعذر تصدير النسخة الاحتياطية'
            );
        },
    });

    const importBackupMutation = useMutation({
        mutationFn: async () => {
            if (!importFile) {
                throw new Error('يرجى اختيار ملف نسخة احتياطية أولاً');
            }

            const formData = new FormData();
            formData.append('file', importFile);

            const response = await fetch('/api/backup/import', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message ?? 'تعذر استيراد النسخة الاحتياطية');
            }

            return data;
        },
        onSuccess: (data) => {
            message.success(
                `تم استيراد النسخة الاحتياطية (${data.data.importedCollections} مجموعة)`
            );
            setImportFile(null);
            settingsQuery.refetch();
        },
        onError: (error) => {
            message.error(
                error instanceof Error ? error.message : 'تعذر استيراد النسخة الاحتياطية'
            );
        },
    });

    return (
        <div>
            <PageHeader title="الإعدادات والنسخ الاحتياطي" />

            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                <Card loading={settingsQuery.isLoading}>
                    <Form<SettingsFormValues>
                        form={form}
                        layout="vertical"
                        onFinish={(values) => saveSettingsMutation.mutate(values)}
                    >
                        <Form.Item
                            name="expiringSoonDays"
                            label="عدد أيام التنبيه قبل الانتهاء"
                            rules={[{ required: true, message: 'هذا الحقل مطلوب' }]}
                        >
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                            name="defaultLowStockThreshold"
                            label="الحد الافتراضي للمخزون المنخفض"
                            rules={[{ required: true, message: 'هذا الحقل مطلوب' }]}
                        >
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                            label="أقصى نسبة خصم مسموحة"
                            required
                        >
                            <Space.Compact style={{ width: '100%' }}>
                                <Form.Item
                                    name="maxDiscountPercentageDisplay"
                                    noStyle
                                    rules={[{ required: true, message: 'هذا الحقل مطلوب' }]}
                                >
                                    <InputNumber
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                                <div style={{
                                    padding: '0 11px',
                                    backgroundColor: '#f5f5f5',
                                    border: '1px solid #d9d9d9',
                                    borderLeft: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRadius: '0 6px 6px 0',
                                    whiteSpace: 'nowrap'
                                }}>
                                    %
                                </div>
                            </Space.Compact>
                            <Text type="secondary" style={{ fontSize: '12px', marginTop: 4, display: 'block' }}>
                                القيمة المعروضة بالنسبة المئوية العادية، وليست بوحدة basis points.
                            </Text>
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={saveSettingsMutation.isPending}
                        >
                            حفظ الإعدادات
                        </Button>
                    </Form>
                </Card>

                <Card>
                    <Divider style={{ marginTop: 0 }}>
                        النسخ الاحتياطي
                    </Divider>

                    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                        <div>
                            <Button
                                icon={<DownloadOutlined />}
                                loading={exportBackupMutation.isPending}
                                onClick={() => exportBackupMutation.mutate()}
                            >
                                تصدير نسخة احتياطية
                            </Button>
                        </div>

                        <div>
                            <Upload
                                maxCount={1}
                                beforeUpload={(file) => {
                                    setImportFile(file);
                                    return false;
                                }}
                                onRemove={() => {
                                    setImportFile(null);
                                }}
                            >
                                <Button icon={<UploadOutlined />}>اختيار ملف للاستيراد</Button>
                            </Upload>
                            <Text type="secondary">
                                {importFile
                                    ? `الملف المختار: ${importFile.name}`
                                    : 'لم يتم اختيار ملف بعد'}
                            </Text>
                        </div>

                        <div>
                            <Button
                                type="primary"
                                loading={importBackupMutation.isPending}
                                onClick={() => importBackupMutation.mutate()}
                            >
                                استيراد النسخة الاحتياطية
                            </Button>
                        </div>
                    </Space>
                </Card>
            </Space>
        </div>
    );
}
