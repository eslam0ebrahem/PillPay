'use client';

import { Form, Input, Button, Alert, Typography } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import ar from '@/i18n/ar';

const { Title, Paragraph } = Typography;

export default function LoginPage() {
    const { login, loginError, isLoggingIn } = useAuth();

    const onFinish = async (values: { email: string; password: string }) => {
        try {
            await login(values);
        } catch {
            // Error is handled by loginError state
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <Title level={2} style={{ textAlign: 'center', color: '#1677ff', marginBottom: 8 }}>
                    PillPay
                </Title>
                <Paragraph style={{ textAlign: 'center', color: '#8c8c8c', marginBottom: 32 }}>
                    {ar.appDescription}
                </Paragraph>

                {loginError && (
                    <Alert
                        title={loginError.message}
                        type="error"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />
                )}

                <Form
                    name="login"
                    onFinish={onFinish}
                    layout="vertical"
                    size="large"
                    requiredMark={false}
                >
                    <Form.Item
                        name="email"
                        label={ar.auth.email}
                        rules={[{ required: true, message: 'البريد الإلكتروني مطلوب' }]}
                    >
                        <Input
                            prefix={<MailOutlined />}
                            placeholder="owner@pillpay.com"
                            dir="ltr"
                            style={{ textAlign: 'left' }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={ar.auth.password}
                        rules={[{ required: true, message: 'كلمة المرور مطلوبة' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="••••••••"
                            dir="ltr"
                            style={{ textAlign: 'left' }}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={isLoggingIn}
                            block
                            style={{ height: 48, fontSize: 16, fontWeight: 600 }}
                        >
                            {ar.auth.loginButton}
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        </div>
    );
}
