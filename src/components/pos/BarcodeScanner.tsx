'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Typography, Flex, Spin } from 'antd';
import { CloseOutlined, ScanOutlined } from '@ant-design/icons';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import ar from '@/i18n/ar';

const { Text } = Typography;

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    // Controlled props (Optional)
    open?: boolean;
    onClose?: () => void;
    // Uncontrolled props (Button trigger)
    buttonText?: React.ReactNode;
    buttonProps?: any;
}

export default function BarcodeScanner({ 
    onScan, 
    open: controlledOpen, 
    onClose: controlledOnClose, 
    buttonText, 
    buttonProps 
}: BarcodeScannerProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    const SCANNER_ID = 'pos-barcode-reader';

    // Determine if we are relying on external state or internal button state
    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : internalOpen;

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleClose = () => {
        if (isControlled && controlledOnClose) {
            controlledOnClose();
        } else {
            setInternalOpen(false);
        }
    };

    const handleScanSuccess = (decodedText: string) => {
        onScan(decodedText);
        handleClose();
    };

    const { error, hasCameraPermission } = useBarcodeScan({
        elementId: SCANNER_ID,
        onScanSuccess: handleScanSuccess,
        isActive: isOpen,
    });

    if (!mounted) return null;

    return (
        <>
            {/* Render the trigger button if it's not strictly controlled by an external state */}
            {(!isControlled || buttonProps) && (
                <Button
                    icon={<ScanOutlined />}
                    onClick={() => setInternalOpen(true)}
                    {...buttonProps}
                >
                    {buttonText !== undefined ? buttonText : ar.pos.scanBarcode}
                </Button>
            )}

            <Modal
                open={isOpen}
                onCancel={handleClose}
                footer={null}
                closeIcon={null}
                destroyOnHidden
                centered
                width="100vw"
                style={{ top: 0, margin: 0, padding: 0, maxWidth: '100vw', borderRadius: 0, background: '#000', boxShadow: 'none' }}
                styles={{
                    mask: { background: '#000' },
                    body: { 
                        padding: 0, 
                        height: '100dvh', // Dynamic viewport height prevents scrolling on iOS Safari
                        width: '100vw',
                        overflow: 'hidden', 
                        position: 'relative'
                    }
                }}
            >
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    
                    {/* The actual video feed container */}
                    <div 
                        id={SCANNER_ID} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />

                    {/* Scanner UI Overlay */}
                    {hasCameraPermission !== false && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            pointerEvents: 'none', // Lets clicks pass through to the video if needed
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0, 0, 0, 0.4)', // Dim the areas outside the box
                        }}>
                            
                            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 24, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                {ar.pos.scanBarcode}
                            </Text>

                            {/* Center Target Box */}
                            <div style={{
                                width: '75vw',
                                maxWidth: 300,
                                height: '25vh',
                                minHeight: 150,
                                border: '2px solid rgba(255, 255, 255, 0.5)',
                                borderRadius: 16,
                                position: 'relative',
                                boxShadow: '0 0 0 4000px rgba(0,0,0,0.5)', // Fallback cutout effect
                                overflow: 'hidden'
                            }}>
                                {/* Red Laser Line */}
                                <div style={{
                                    width: '100%',
                                    height: 2,
                                    background: '#ff4d4f',
                                    position: 'absolute',
                                    top: '50%',
                                    boxShadow: '0 0 8px #ff4d4f'
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Camera Permission Error Overlay */}
                    {hasCameraPermission === false && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: '#000',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 24,
                            textAlign: 'center'
                        }}>
                            <Text strong style={{ fontSize: 18, color: '#ff4d4f', marginBottom: 8 }}>{ar.pos.cameraError}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>{error || 'يرجى السماح باستخدام الكاميرا من إعدادات المتصفح.'}</Text>
                        </div>
                    )}

                    {/* Bottom-Centered Thumb-Friendly Close Button */}
                    <div style={{
                        position: 'absolute',
                        bottom: 40,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        pointerEvents: 'auto' // Re-enable clicks for the button
                    }}>
                        <Button 
                            danger 
                            type="primary" 
                            shape="circle" 
                            icon={<CloseOutlined style={{ fontSize: 24 }} />} 
                            size="large"
                            style={{ width: 64, height: 64, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                            onClick={handleClose}
                        />
                    </div>

                </div>
            </Modal>
        </>
    );
}