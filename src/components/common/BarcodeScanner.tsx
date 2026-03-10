'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Button, Modal, message } from 'antd';
import { CameraOutlined } from '@ant-design/icons';

interface BarcodeScannerProps {
    onScan: (decodedText: string) => void;
    buttonText?: string;
    buttonProps?: any;
}

export default function BarcodeScanner({ onScan, buttonText = 'مسح بالكميرا', buttonProps }: BarcodeScannerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (isModalOpen) {
            // Give the modal a moment to render the div
            const timer = setTimeout(() => {
                scannerRef.current = new Html5QrcodeScanner(
                    'reader',
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    /* verbose= */ false
                );

                scannerRef.current.render(
                    (decodedText) => {
                        // Success callback
                        onScan(decodedText);
                        closeScanner();
                    },
                    (errorMessage) => {
                        // Error callback (called frequently, usually ignored)
                        // console.log(errorMessage);
                    }
                );
            }, 100);

            return () => {
                clearTimeout(timer);
                closeScanner();
            };
        }
    }, [isModalOpen, onScan]);

    const closeScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(error => {
                console.error('Failed to clear html5QrcodeScanner. ', error);
            });
            scannerRef.current = null;
        }
        setIsModalOpen(false);
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
                title="مسح الباركود بالكاميرا"
                open={isModalOpen}
                onCancel={closeScanner}
                footer={null}
                destroyOnHidden
            >
                <div>
                    <div id="reader" style={{ width: '100%' }}></div>
                    <p style={{ textAlign: 'center', marginTop: 16 }}>
                        قم بتوجيه الكاميرا نحو الباركود
                    </p>
                </div>
            </Modal>
        </>
    );
}
