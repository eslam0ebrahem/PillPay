'use client';

import React from 'react';
import { Button, Result } from 'antd';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Result
                    status="error"
                    title="حدث خطأ غير متوقع"
                    subTitle="يرجى تحديث الصفحة أو التواصل مع الدعم الفني إذا استمرت المشكلة."
                    extra={
                        <Button type="primary" onClick={() => window.location.reload()}>
                            تحديث الصفحة
                        </Button>
                    }
                />
            );
        }

        return this.props.children;
    }
}
