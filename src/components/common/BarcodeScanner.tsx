'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button, Modal, Typography, Spin, Flex } from 'antd';
import { 
    CameraOutlined, 
    CloseOutlined, 
    LoadingOutlined, 
    ThunderboltOutlined, 
    ThunderboltFilled 
} from '@ant-design/icons';

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
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);
    
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const transitioningRef = useRef(false);
    const onScanRef = useRef(onScan);

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    const SCANNER_ID = 'barcode-reader-container';

    const stopScanner = async () => {
        if (scannerRef.current?.isScanning) {
            try {
                await scannerRef.current.stop();
                await scannerRef.current.clear();
            } catch (e) {
                console.log('Handled scanner transition');
            }
        }
    };

    useEffect(() => {
        let isMounted = true;

        const startScanner = async () => {
            if (!isModalOpen || transitioningRef.current) return;
            
            setIsInitializing(true);
            setCameraError(null);
            transitioningRef.current = true;

            try {
                // Ensure DOM is ready
                await new Promise(resolve => setTimeout(resolve, 400));
                
                if (!isMounted || !isModalOpen) return;

                if (!scannerRef.current) {
                    scannerRef.current = new Html5Qrcode(SCANNER_ID);
                }

                await stopScanner();

                await scannerRef.current.start(
                    { facingMode: 'environment' },
                    {
                        fps: 25,
                        qrbox: (viewfinderWidth, viewfinderHeight) => {
                            const w = viewfinderWidth * 0.8;
                            const h = Math.min(w * 0.5, 150);
                            return { width: w, height: h };
                        },
                        // Setting a square aspect ratio often helps mobile browsers 
                        // center the feed correctly within the cover fit
                        aspectRatio: 1.0, 
                    },
                    (decodedText) => {
                        if (isMounted) {
                            onScanRef.current(decodedText);
                            handleClose();
                            if (navigator.vibrate) navigator.vibrate(100);
                        }
                    },
                    () => {} 
                );

                const cameraFeatures = scannerRef.current.getRunningTrackCapabilities();
                if (cameraFeatures && (cameraFeatures as any).torch) {
                    setHasTorch(true);
                }

                if (isMounted) setIsInitializing(false);
            } catch (err: any) {
                if (isMounted) {
                    setCameraError('خطأ في تشغيل الكاميرا');
                    setIsInitializing(false);
                }
            } finally {
                transitioningRef.current = false;
            }
        };

        startScanner();

        return () => {
            isMounted = false;
            stopScanner();
        };
    }, [isModalOpen]);

    const handleClose = () => {
        setIsModalOpen(false);
        setIsTorchOn(false);
        stopScanner();
    };

    const toggleTorch = async () => {
        if (scannerRef.current && hasTorch) {
            const newState = !isTorchOn;
            try {
                await scannerRef.current.applyVideoConstraints({
                    advanced: [{ torch: newState }] as any
                });
                setIsTorchOn(newState);
            } catch (e) {
                console.error('Torch error:', e);
            }
        }
    };

    return (
        <>
            <Button icon={<CameraOutlined />} onClick={() => setIsModalOpen(true)} {...buttonProps}>
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
                // The Modal MUST have these styles to avoid "offset" shifts
                style={{ top: 0, margin: 0, padding: 0, maxWidth: '100vw', height: '100dvh' }}
                styles={{
                    mask: { background: '#000' },
                    container: { padding: 0, borderRadius: 0, background: '#000', height: '100dvh' },
                    body: { padding: 0, height: '100dvh', width: '100vw', overflow: 'hidden' }
                }}
            >
                {/* 1. Viewport Wrapper: Lock the content to the absolute window */}
                <div style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    width: '100vw', 
                    height: '100dvh', 
                    backgroundColor: '#000',
                    zIndex: 9999,
                    overflow: 'hidden'
                }}>
                    
                    {/* 2. Global CSS Overrides for html5-qrcode's injected elements */}
                    <style>{`
                        #${SCANNER_ID} {
                            width: 100% !important;
                            height: 100% !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                        }
                        #${SCANNER_ID} video {
                            width: 100% !important;
                            height: 100% !important;
                            object-fit: cover !important;
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                        }
                        #${SCANNER_ID} canvas {
                            display: none !important;
                        }
                        @keyframes scan-line {
                            0% { transform: translateY(0); }
                            100% { transform: translateY(120px); }
                        }
                    `}</style>

                    <div id={SCANNER_ID} />

                    {/* 3. States Overlay */}
                    {(isInitializing || cameraError) && (
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
                            justifyContent: 'center', alignItems: 'center', background: '#000', zIndex: 10
                        }}>
                            {isInitializing ? (
                                <Spin indicator={<LoadingOutlined style={{ fontSize: 40, color: '#1677ff' }} spin />} />
                            ) : (
                                <Flex vertical align="center" gap={16}>
                                    <Text strong style={{ color: '#ff4d4f' }}>{cameraError}</Text>
                                    <Button ghost onClick={handleClose}>إغلاق</Button>
                                </Flex>
                            )}
                        </div>
                    )}

                    {/* 4. Scanning Mask (The Cutout) */}
                    {!isInitializing && !cameraError && (
                        <div style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            zIndex: 5
                        }}>
                            {/* Dark Overlays */}
                            <div style={{ flex: 1, width: '100%', background: 'rgba(0,0,0,0.5)' }} />
                            <div style={{ display: 'flex', width: '100%', height: '140px' }}>
                                <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} />
                                <div style={{ 
                                    width: '85vw', 
                                    maxWidth: '340px', 
                                    height: '100%', 
                                    border: '2px solid #fff', 
                                    borderRadius: '12px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    {/* Laser */}
                                    <div style={{
                                        width: '100%', height: '2px', background: '#ff4d4f',
                                        boxShadow: '0 0 10px #ff4d4f',
                                        animation: 'scan-line 2s infinite linear'
                                    }} />
                                </div>
                                <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} />
                            </div>
                            <div style={{ flex: 1, width: '100%', background: 'rgba(0,0,0,0.5)', textAlign: 'center', paddingTop: '20px' }}>
                                <Text style={{ color: '#fff' }}>ضع الباركود داخل الإطار</Text>
                            </div>
                        </div>
                    )}

                    {/* 5. Fixed Controls at the bottom */}
                    <div style={{
                        position: 'absolute', bottom: 'env(safe-area-inset-bottom, 20px)', left: 0, right: 0,
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40,
                        paddingBottom: '30px', zIndex: 100
                    }}>
                        {hasTorch && (
                            <Button 
                                type={isTorchOn ? "primary" : "default"}
                                shape="circle" 
                                icon={isTorchOn ? <ThunderboltFilled /> : <ThunderboltOutlined />} 
                                size="large"
                                style={{ width: 56, height: 56, border: 'none', background: isTorchOn ? undefined : 'rgba(255,255,255,0.2)' }}
                                onClick={toggleTorch}
                            />
                        )}

                        <Button 
                            danger type="primary" shape="circle" 
                            icon={<CloseOutlined style={{ fontSize: 24 }} />} 
                            size="large"
                            style={{ width: 70, height: 70, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                            onClick={handleClose}
                        />
                        {hasTorch && <div style={{ width: 56 }} />}
                    </div>
                </div>
            </Modal>
        </>
    );
}