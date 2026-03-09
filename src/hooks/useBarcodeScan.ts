import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UseBarcodeScanOptions {
    elementId: string;
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (errorMessage: string) => void;
    isActive: boolean; // Control whether scanner is running
}

export function useBarcodeScan({ elementId, onScanSuccess, onScanFailure, isActive }: UseBarcodeScanOptions) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const startScanner = async () => {
            try {
                const hasPerms = await Html5Qrcode.getCameras();
                if (hasPerms && hasPerms.length > 0) {
                    if (active) setHasCameraPermission(true);

                    if (!scannerRef.current) {
                        scannerRef.current = new Html5Qrcode(elementId);
                    }

                    if (scannerRef.current.isScanning) {
                        await scannerRef.current.stop();
                    }

                    if (active) {
                        await scannerRef.current.start(
                            { facingMode: 'environment' }, // Prefer back camera
                            {
                                fps: 10,
                                qrbox: { width: 250, height: 150 },
                                aspectRatio: 1.0,
                            },
                            (decodedText) => {
                                // Success callback
                                onScanSuccess(decodedText);
                            },
                            (errorMessage) => {
                                // Failure callback (happens constantly when no code in view, usually ignore)
                                if (onScanFailure) onScanFailure(errorMessage);
                            }
                        );
                    }
                } else {
                    if (active) {
                        setHasCameraPermission(false);
                        setError('No cameras found.');
                    }
                }
            } catch (err) {
                if (active) {
                    setHasCameraPermission(false);
                    setError(err instanceof Error ? err.message : String(err));
                }
            }
        };

        const stopScanner = async () => {
            try {
                if (scannerRef.current && scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
            } catch (err) {
                console.warn("Error stopping scanner", err);
            }
        };

        if (isActive) {
            startScanner();
        } else {
            stopScanner();
        }

        return () => {
            active = false;
            stopScanner();
        };
    }, [elementId, isActive, onScanSuccess, onScanFailure]);

    return { hasCameraPermission, error };
}
