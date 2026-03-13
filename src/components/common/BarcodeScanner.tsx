'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Button, Typography, Spin, Flex } from 'antd';
import {
    CameraOutlined,
    CloseOutlined,
    LoadingOutlined,
    ThunderboltOutlined,
    ThunderboltFilled,
    ReloadOutlined,
} from '@ant-design/icons';
import type { ButtonProps } from 'antd';

const { Text } = Typography;

const SCANNER_ID = 'barcode-reader-container';

// Injected into the portal — scoped to SCANNER_ID so it never leaks
const SCANNER_CSS = `
    #${SCANNER_ID} {
        width: 100% !important;
        height: 100% !important;
        position: relative !important;
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
    @keyframes scan-laser {
        0%   { transform: translateY(0); }
        100% { transform: translateY(136px); }
    }
`;

interface TorchCapabilities {
    torch?: boolean;
}

interface BarcodeScannerProps {
    onScan: (decodedText: string) => void;
    buttonText?: string;
    buttonProps?: Omit<ButtonProps, 'onClick'>;
}

export default function BarcodeScanner({
    onScan,
    buttonText = 'مسح بالكاميرا',
    buttonProps,
}: BarcodeScannerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);
    const [mounted, setMounted] = useState(false);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const transitioningRef = useRef(false);
    const onScanRef = useRef(onScan);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    // Lock body scroll when scanner is open (same as a Modal would)
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current?.isScanning) {
            try {
                await scannerRef.current.stop();
                await scannerRef.current.clear();
            } catch {
                // Safe to ignore during transitions
            }
        }
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setIsTorchOn(false);
        setHasTorch(false);
        stopScanner();
    }, [stopScanner]);

    const handleRetry = useCallback(() => {
        setCameraError(null);
        setIsOpen(false);
        setTimeout(() => setIsOpen(true), 100);
    }, []);

    const toggleTorch = useCallback(async () => {
        if (!scannerRef.current || !hasTorch) return;
        const newState = !isTorchOn;
        try {
            await scannerRef.current.applyVideoConstraints({
                advanced: [{ torch: newState } as MediaTrackConstraintSet],
            });
            setIsTorchOn(newState);
        } catch (e) {
            console.error('Torch toggle failed:', e);
        }
    }, [hasTorch, isTorchOn]);

    useEffect(() => {
        let isMounted = true;

        const startScanner = async () => {
            if (!isOpen || transitioningRef.current) return;

            setIsInitializing(true);
            setCameraError(null);
            transitioningRef.current = true;

            try {
                // Let the portal finish painting before html5-qrcode accesses the DOM node
                await new Promise((resolve) => setTimeout(resolve, 300));
                if (!isMounted || !isOpen) return;

                if (!scannerRef.current) {
                    scannerRef.current = new Html5Qrcode(SCANNER_ID);
                }

                await stopScanner();

                await scannerRef.current.start(
                    { facingMode: 'environment' },
                    {
                        fps: 25,
                        qrbox: (w, h) => ({
                            width: Math.min(w * 0.85, 340),
                            height: Math.min(w * 0.85 * 0.42, 140),
                        }),
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        if (!isMounted) return;
                        onScanRef.current(decodedText);
                        if (navigator.vibrate) navigator.vibrate(100);
                        handleClose();
                    },
                    () => {}
                );

                const capabilities =
                    scannerRef.current.getRunningTrackCapabilities() as TorchCapabilities;
                if (capabilities?.torch) setHasTorch(true);

                if (isMounted) setIsInitializing(false);
            } catch {
                if (isMounted) {
                    setCameraError('تعذّر الوصول إلى الكاميرا. تحقق من الأذونات وأعد المحاولة.');
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
    }, [isOpen, stopScanner, handleClose]);

    const scanBoxHeight = 140;
    const cornerStyle: React.CSSProperties = {
        position: 'absolute',
        width: 20,
        height: 20,
        borderColor: '#fff',
        borderStyle: 'solid',
    };

    // The portal content — rendered directly into document.body, completely
    // outside the React tree's DOM hierarchy. No Modal transform issues.
    // position:fixed here is guaranteed to work because document.body is
    // never a transformed ancestor.
    const scannerPortal = (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1200, // above BottomTabBar (1001) and MobileFormWrapper (1050)
                backgroundColor: '#000',
                overflow: 'hidden',
            }}
        >
            <style>{SCANNER_CSS}</style>

            {/* Camera feed mount point */}
            <div
                id={SCANNER_ID}
                style={{ position: 'absolute', inset: 0 }}
            />

            {/* Loading / Error overlay */}
            {(isInitializing || cameraError) && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: '#000',
                        zIndex: 10,
                    }}
                >
                    {isInitializing ? (
                        <Flex vertical align="center" gap={16}>
                            <Spin
                                indicator={
                                    <LoadingOutlined
                                        style={{ fontSize: 40, color: '#1677ff' }}
                                        spin
                                    />
                                }
                            />
                            <Text style={{ color: '#8c8c8c' }}>
                                جاري تشغيل الكاميرا...
                            </Text>
                        </Flex>
                    ) : (
                        <Flex
                            vertical
                            align="center"
                            gap={16}
                            style={{ padding: '0 32px', textAlign: 'center' }}
                        >
                            <Text strong style={{ color: '#ff4d4f', fontSize: 15 }}>
                                {cameraError}
                            </Text>
                            <Flex gap={12}>
                                <Button
                                    type="primary"
                                    icon={<ReloadOutlined />}
                                    onClick={handleRetry}
                                >
                                    إعادة المحاولة
                                </Button>
                                <Button ghost onClick={handleClose}>
                                    إغلاق
                                </Button>
                            </Flex>
                        </Flex>
                    )}
                </div>
            )}

            {/* Scanning mask with corner-bracket cutout */}
            {!isInitializing && !cameraError && (
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 5,
                    }}
                >
                    {/* Top dark band */}
                    <div style={{ flex: 1, width: '100%', background: 'rgba(0,0,0,0.55)' }} />

                    {/* Middle row: left shade | cutout | right shade */}
                    <div style={{ display: 'flex', width: '100%', height: scanBoxHeight }}>
                        <div style={{ flex: 1, background: 'rgba(0,0,0,0.55)' }} />

                        {/* Transparent cutout with corner brackets */}
                        <div
                            style={{
                                width: 'min(85vw, 340px)',
                                height: scanBoxHeight,
                                position: 'relative',
                                borderRadius: 12,
                                overflow: 'hidden',
                            }}
                        >
                            <div style={{ ...cornerStyle, top: 0, left: 0,  borderWidth: '3px 0 0 3px', borderRadius: '10px 0 0 0'  }} />
                            <div style={{ ...cornerStyle, top: 0, right: 0, borderWidth: '3px 3px 0 0', borderRadius: '0 10px 0 0'  }} />
                            <div style={{ ...cornerStyle, bottom: 0, left: 0,  borderWidth: '0 0 3px 3px', borderRadius: '0 0 0 10px' }} />
                            <div style={{ ...cornerStyle, bottom: 0, right: 0, borderWidth: '0 3px 3px 0', borderRadius: '0 0 10px 0' }} />

                            {/* Laser — ping-pong */}
                            <div
                                style={{
                                    width: '100%',
                                    height: 2,
                                    background: 'linear-gradient(to right, transparent, #ff4d4f, transparent)',
                                    boxShadow: '0 0 8px #ff4d4f',
                                    animation: 'scan-laser 1.8s ease-in-out infinite alternate',
                                }}
                            />
                        </div>

                        <div style={{ flex: 1, background: 'rgba(0,0,0,0.55)' }} />
                    </div>

                    {/* Bottom dark band with hint */}
                    <div
                        style={{
                            flex: 1,
                            width: '100%',
                            background: 'rgba(0,0,0,0.55)',
                            display: 'flex',
                            justifyContent: 'center',
                            paddingTop: 20,
                        }}
                    >
                        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                            ضع الباركود داخل الإطار
                        </Text>
                    </div>
                </div>
            )}

            {/* Bottom controls */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    paddingBottom: 'calc(30px + env(safe-area-inset-bottom, 0px))',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 40,
                    zIndex: 10,
                }}
            >
                {/* visibility:hidden keeps close button centered when no torch */}
                <div style={{ width: 56, visibility: hasTorch ? 'visible' : 'hidden' }}>
                    <Button
                        type={isTorchOn ? 'primary' : 'default'}
                        shape="circle"
                        icon={isTorchOn ? <ThunderboltFilled /> : <ThunderboltOutlined />}
                        size="large"
                        aria-label={isTorchOn ? 'إيقاف الفلاش' : 'تشغيل الفلاش'}
                        style={{
                            width: 56,
                            height: 56,
                            border: 'none',
                            background: isTorchOn ? undefined : 'rgba(255,255,255,0.2)',
                        }}
                        onClick={toggleTorch}
                    />
                </div>

                <Button
                    danger
                    type="primary"
                    shape="circle"
                    icon={<CloseOutlined style={{ fontSize: 24 }} />}
                    size="large"
                    aria-label="إغلاق الكاميرا"
                    style={{ width: 70, height: 70, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    onClick={handleClose}
                />

                {/* Mirror spacer */}
                <div style={{ width: 56 }} />
            </div>
        </div>
    );

    return (
        <>
            <Button
                icon={<CameraOutlined />}
                onClick={() => setIsOpen(true)}
                {...buttonProps}
            >
                {buttonText}
            </Button>

            {/*
                Portal renders directly into document.body — completely outside
                the component tree's DOM. This is the only reliable way to get
                true full-screen on mobile without Modal transform interference.
                mounted check prevents SSR mismatch.
            */}
            {mounted && isOpen && createPortal(scannerPortal, document.body)}
        </>
    );
}
