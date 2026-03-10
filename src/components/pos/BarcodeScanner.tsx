'use client';

import { Modal, Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import ar from '@/i18n/ar';

interface BarcodeScannerProps {
    open: boolean;
    onClose: () => void;
    onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
    const SCANNER_ID = 'pos-barcode-reader';

    const handleScanSuccess = (decodedText: string) => {
        onScan(decodedText);
        onClose();
    };

    const { error, hasCameraPermission } = useBarcodeScan({
        elementId: SCANNER_ID,
        onScanSuccess: handleScanSuccess,
        isActive: open,
    });

    return (
        <Modal
            open={open}
            onCancel={onClose}
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
                <button className="scanner-close-btn" onClick={onClose}>
                    <CloseOutlined />
                </button>

                <div id={SCANNER_ID} className="scanner-video-wrapper"></div>

                {hasCameraPermission !== false && (
                    <div className="scanner-overlay">
                        <div className="scanner-cutout">
                            <div className="scanner-corner scanner-corner-tl" />
                            <div className="scanner-corner scanner-corner-tr" />
                            <div className="scanner-corner scanner-corner-bl" />
                            <div className="scanner-corner scanner-corner-br" />
                            <div className="scanner-laser" />
                        </div>
                        <div className="scanner-hint">
                            {ar.pos.scanBarcode}
                        </div>
                    </div>
                )}

                {hasCameraPermission === false && (
                    <div className="scanner-overlay" style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.8)' }}>
                        <div style={{ color: 'white', textAlign: 'center', padding: 20 }}>
                            <p style={{ fontSize: 18, marginBottom: 8 }}>{ar.pos.cameraError}</p>
                            <p style={{ opacity: 0.7 }}>{error}</p>
                            <Button ghost onClick={onClose} style={{ marginTop: 24 }}>
                                {ar.actions.close}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
