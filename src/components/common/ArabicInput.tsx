'use client';

import { Input, type InputProps } from 'antd';
import { forwardRef } from 'react';

interface ArabicInputProps extends InputProps {
    label?: string;
}

const ArabicInput = forwardRef<HTMLInputElement, ArabicInputProps>(
    ({ style, ...props }, ref) => {
        return (
            <Input
                ref={ref as React.Ref<any>}
                dir="rtl"
                style={{ textAlign: 'right', ...style }}
                {...props}
            />
        );
    }
);

ArabicInput.displayName = 'ArabicInput';

export default ArabicInput;
