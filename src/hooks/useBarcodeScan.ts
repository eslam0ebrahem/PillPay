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

    // Use refs for callbacks to prevent effect re-runs when they change
    const onScanSuccessRef = useRef(onScanSuccess);
    const onScanFailureRef = useRef(onScanFailure);

    useEffect(() => {
        onScanSuccessRef.current = onScanSuccess;
        onScanFailureRef.current = onScanFailure;
    }, [onScanSuccess, onScanFailure]);

    useEffect(() => {
        let isMounted = true;

        const startScanner = async () => {
            // Wait for next tick to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!isMounted || !isActive) return;

            try {
                const element = document.getElementById(elementId);
                if (!element) {
                    console.debug(`Scanner element #${elementId} not found yet, skipping.`);
                    return;
                }

                // Initialize if not exists
                if (!scannerRef.current) {
                    scannerRef.current = new Html5Qrcode(elementId);
                }

                // If already scanning, don't start again
                if (scannerRef.current.isScanning) {
                    return;
                }

                const cameras = await Html5Qrcode.getCameras();
                if (cameras && cameras.length > 0) {
                    if (isMounted) setHasCameraPermission(true);

                    await scannerRef.current.start(
                        { facingMode: 'environment' },
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 150 },
                            aspectRatio: 1.0,
                        },
                        (text) => onScanSuccessRef.current?.(text),
                        (err) => onScanFailureRef.current?.(err)
                    );
                } else {
                    if (isMounted) {
                        setHasCameraPermission(false);
                        setError('No cameras found.');
                    }
                }
            } catch (err) {
                if (isMounted) {
                    setHasCameraPermission(false);
                    // Ignore errors caused by transitions if we are trying to start/stop quickly
                    if (!(err instanceof Error && err.message.includes('transition'))) {
                        setError(err instanceof Error ? err.message : String(err));
                        console.error('Barcode scanner start error:', err);
                    }
                }
            }
        };

        const stopScanner = async () => {
            try {
                if (scannerRef.current && scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
            } catch (err) {
                // Ignore "already under transition" errors during stop
                if (!(err instanceof Error && err.message.includes('transition'))) {
                    console.warn('Error stopping scanner:', err);
                }
            }
        };

        if (isActive) {
            startScanner();
        } else {
            stopScanner();
        }

        return () => {
            isMounted = false;
            stopScanner();
        };
    }, [elementId, isActive]); // Removed onScanSuccess/Failure from dependencies

    return { hasCameraPermission, error };
}
