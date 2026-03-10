'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button, Modal } from 'antd';
import { CameraOutlined, CloseOutlined } from '@ant-design/icons';

interface BarcodeScannerProps {
    onScan: (decodedText: string) => void;
    buttonText?: string;
    buttonProps?: any;
}

export default function BarcodeScanner({ onScan, buttonText = 'مسح بالكميرا', buttonProps }: BarcodeScannerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const SCANNER_ID = 'barcode-reader';

    useEffect(() => {
        if (isModalOpen) {
            const startScanner = async () => {
                try {
                    // Give the modal a moment to render the div
                    await new Promise(resolve => setTimeout(resolve, 300));

                    if (!scannerRef.current) {
                        scannerRef.current = new Html5Qrcode(SCANNER_ID);
                    }

                    if (scannerRef.current.isScanning) {
                        await scannerRef.current.stop();
                    }

                    setIsScanning(true);
                    await scannerRef.current.start(
                        { facingMode: 'environment' },
                        {
                            fps: 20,
                            qrbox: (viewfinderWidth, viewfinderHeight) => {
                                // Dynamic qrbox size based on viewfinder
                                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                                const size = Math.floor(minEdge * 0.7);
                                return { width: size, height: size };
                            },
                        },
                        (decodedText) => {
                            onScan(decodedText);
                            handleClose();
                        },
                        () => {
                            // Ignored error frames
                        }
                    );
                } catch (err) {
                    console.error('Scanner start error:', err);
                    setIsScanning(false);
                }
            };

            startScanner();

            return () => {
                if (scannerRef.current?.isScanning) {
                    scannerRef.current.stop().catch(e => console.error('Stop error:', e));
                }
            };
        }
    }, [isModalOpen]);

    const handleClose = async () => {
        if (scannerRef.current?.isScanning) {
            try {
                await scannerRef.current.stop();
            } catch (e) {
                console.error('Error stopping:', e);
            }
        }
        setIsModalOpen(false);
        setIsScanning(false);
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
                className="scanner-modal"
                width="100%"
                centered
                styles={{
                    body: { padding: 0, height: '100vh', overflow: 'hidden', background: '#000' }
                }}
            >
                <div className="scanner-container">
                    <button className="scanner-close-btn" onClick={handleClose}>
                        <CloseOutlined />
                    </button>

                    <div id={SCANNER_ID} className="scanner-video-wrapper"></div>

                    <div className="scanner-overlay">
                        <div className="scanner-cutout">
                            <div className="scanner-corner scanner-corner-tl" />
                            <div className="scanner-corner scanner-corner-tr" />
                            <div className="scanner-corner scanner-corner-bl" />
                            <div className="scanner-corner scanner-corner-br" />
                            <div className="scanner-laser" />
                        </div>
                        <div className="scanner-hint">
                            قم بتوجيه الكاميرا نحو الباركود
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}
