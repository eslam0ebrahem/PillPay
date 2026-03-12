'use client';

import React, { forwardRef } from 'react';
import { Input, Typography } from 'antd';
import type { InputProps, InputRef } from 'antd';

const { Text } = Typography;

export interface ArabicInputProps extends InputProps {
    label?: string;
}

const ArabicInput = forwardRef<InputRef, ArabicInputProps>(
    ({ style, size = 'large', label, ...props }, ref) => {
        return (
            <div style={{ width: '100%' }}>
                {/* 1. Actually render the missing label if provided */}
                {label && (
                    <Text 
                        strong 
                        style={{ 
                            display: 'block', 
                            marginBottom: 8, 
                            textAlign: 'right', // Enforce RTL alignment for the label
                            fontSize: 14 
                        }}
                    >
                        {label}
                    </Text>
                )}
                
                <Input
                    // 2. Properly typed Ref (no more 'any' casting)
                    ref={ref}
                    dir="rtl"
                    // 3. Tells iOS/Android keyboards to prioritize Arabic suggestions
                    lang="ar"
                    // 4. Default to 'large' for fat-finger friendly mobile touch targets
                    size={size}
                    // 5. Accessibility for screen readers
                    aria-label={label}
                    style={{ 
                        textAlign: 'right', 
                        width: '100%',
                        ...style 
                    }}
                    {...props}
                />
            </div>
        );
    }
);

ArabicInput.displayName = 'ArabicInput';

export default ArabicInput;