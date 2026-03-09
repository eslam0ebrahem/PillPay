'use client';

import { Modal, Typography, Space, Button } from 'antd';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import ar from '@/i18n/ar';

const { Text } = Typography;

interface BarcodeScannerProps {
    open: boolean;
    onClose: () => void;
    onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
    const SCANNER_ID = 'reader-container';

    const handleScanSuccess = (decodedText: string) => {
        // We get a hit, close the modal and emit the barcode
        // In some cases it might scan multiple times fast, so emit once and close.
        // The closing of the modal will stop the scanner via the hook.
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
            title={ar.pos.scanBarcode}
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    {ar.actions.cancel}
                </Button>,
            ]}
            destroyOnClose
        >
            <div style={{ textAlign: 'center', minHeight: 250 }}>
                {hasCameraPermission === false && (
                    <Space direction="vertical" style={{ marginTop: 50 }}>
                        <Text type="danger">{ar.pos.cameraError}</Text>
                        <Text type="secondary">{error}</Text>
                    </Space>
                )}
                <div id={SCANNER_ID} style={{ width: '100%' }}></div>
            </div>
        </Modal>
    );
}
