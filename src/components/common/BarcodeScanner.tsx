'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button, Modal, Typography, Spin, Flex } from 'antd';
import { CameraOutlined, CloseOutlined, LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface BarcodeScannerProps {
    onScan: (decodedText: string) => void;
    buttonText?: string;
    buttonProps?: any;
}

export default function BarcodeScanner({ onScan, buttonText = 'مسح بالكاميرا', buttonProps }: BarcodeScannerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const SCANNER_ID = 'barcode-reader-container';

    useEffect(() => {
        let isMounted = true;

        const startScanner = async () => {
            if (!isModalOpen) return;
            
            setIsInitializing(true);
            setCameraError(null);

            try {
                // Wait for the Ant Design Modal to fully render the DOM node
                await new Promise(resolve => setTimeout(resolve, 300));

                if (!document.getElementById(SCANNER_ID)) {
                    throw new Error('Scanner container not found in DOM');
                }

                if (!scannerRef.current) {
                    scannerRef.current = new Html5Qrcode(SCANNER_ID);
                }

                // If it's already scanning, stop it before restarting
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }

                await scannerRef.current.start(
                    { facingMode: 'environment' }, // Force back camera on mobile
                    {
                        fps: 15,
                        // Dynamic qrbox size to ensure it fits nicely on any screen size
                        qrbox: (viewfinderWidth, viewfinderHeight) => {
                            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                            const size = Math.max(200, Math.floor(minEdge * 0.7));
                            return { width: size, height: size };
                        },
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        if (isMounted) {
                            onScan(decodedText);
                            handleClose();
                        }
                    },
                    (errorMessage) => {
                        // html5-qrcode spams errors for every frame that doesn't have a barcode.
                        // We safely ignore these background parsing errors.
                    }
                );

                if (isMounted) setIsInitializing(false);

            } catch (err: any) {
                console.error('Scanner start error:', err);
                if (isMounted) {
                    setIsInitializing(false);
                    setCameraError('تعذر الوصول للكاميرا. يرجى التحقق من الصلاحيات.');
                }
            }
        };

        startScanner();

        return () => {
            isMounted = false;
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop()
                    .then(() => scannerRef.current?.clear())
                    .catch(e => console.error('Stop error during unmount:', e));
            }
        };
    }, [isModalOpen, onScan]);

    const handleClose = async () => {
        setIsModalOpen(false);
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (e) {
                console.error('Error stopping scanner:', e);
            }
        }
    };

    return (
        <>
            <Button
                icon={<CameraOutlined />}
                onClick={() => setIsModalOpen(true)}
                {...buttonProps}
            >
                {buttonText}
            </Button>

            <Modal
                open={isModalOpen}
                onCancel={handleClose}
                footer={null}
                closeIcon={null}
                destroyOnHidden
                centered
                width="100vw"
                style={{ top: 0, margin: 0, padding: 0, maxWidth: '100vw' }}
                styles={{
                    mask: { background: '#000' },
                    container: { 
                        padding: 0, 
                        borderRadius: 0, 
                        background: '#000', 
                        boxShadow: 'none' 
                    },
                    body: { 
                        padding: 0, 
                        height: '100dvh', // Dynamic Viewport Height prevents Safari bottom-bar clipping
                        width: '100vw',
                        overflow: 'hidden', 
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                }}
            >
                <div style={{ position: 'relative', flex: 1, width: '100%', backgroundColor: '#000' }}>
                    
                    {/* Camera Feed Container */}
                    <div 
                        id={SCANNER_ID} 
                        style={{ width: '100%', height: '100%', minHeight: '100dvh' }} 
                    />

                    {/* Loading State */}
                    {isInitializing && !cameraError && (
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
                            justifyContent: 'center', alignItems: 'center', background: '#000', zIndex: 10
                        }}>
                            <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1677ff' }} spin />} />
                            <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>جاري تشغيل الكاميرا...</Text>
                        </div>
                    )}

                    {/* Error State */}
                    {cameraError && (
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
                            justifyContent: 'center', alignItems: 'center', background: '#000', zIndex: 10, padding: 24, textAlign: 'center'
                        }}>
                            <Text strong style={{ color: '#ff4d4f', fontSize: 18, marginBottom: 8 }}>خطأ في الكاميرا</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>{cameraError}</Text>
                        </div>
                    )}

                    {/* Scanner UI Overlay (Visible only when camera is active) */}
                    {!isInitializing && !cameraError && (
                        <div style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            boxShadow: 'inset 0 0 0 5000px rgba(0,0,0,0.4)' // Creates the darkened background with clear center
                        }}>
                            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 32, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                قم بتوجيه الكاميرا نحو الباركود
                            </Text>

                            {/* Center Target Box */}
                            <div style={{
                                width: '70vw', maxWidth: 300, height: '70vw', maxHeight: 300,
                                border: '2px solid rgba(255, 255, 255, 0.5)', borderRadius: 16,
                                position: 'relative', overflow: 'hidden'
                            }}>
                                {/* Animated Red Laser Line */}
                                <div style={{
                                    width: '100%', height: 2, background: '#ff4d4f',
                                    position: 'absolute', top: '50%', boxShadow: '0 0 8px #ff4d4f'
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Thumb-Friendly Bottom Close Button */}
                    <div style={{
                        position: 'absolute', bottom: 48, left: 0, right: 0,
                        display: 'flex', justifyContent: 'center', pointerEvents: 'auto', zIndex: 20
                    }}>
                        <Button 
                            danger 
                            type="primary" 
                            shape="circle" 
                            icon={<CloseOutlined style={{ fontSize: 24 }} />} 
                            size="large"
                            style={{ width: 64, height: 64, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                            onClick={handleClose}
                        />
                    </div>

                </div>
            </Modal>
        </>
    );
}