import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/routes';
import { useNotifications } from '../providers/RealtimeProvider';

interface BarcodeResult {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect: (source: CanvasImageSource) => Promise<BarcodeResult[]>;
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

const normalizeRoomValue = (value: string) => {
  if (!value) return '';
  let trimmed = value.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      const room = (parsed.roomNumber || parsed.room || parsed.location || parsed.room_id) as string | undefined;
      if (room) {
        trimmed = String(room);
      }
    }
  } catch (error) {
    // value is not JSON, continue
  }

  const match = trimmed.match(/room\s*[:#-]?\s*([A-Za-z0-9-]+)/i);
  if (match?.[1]) {
    trimmed = match[1];
  }

  return trimmed.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
};

const QrScanner = () => {
  const navigate = useNavigate();
  const { pushNotification } = useNotifications();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);

  const [status, setStatus] = useState('Initializing camera…');
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');

  const stopScanner = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopScanner();
  }, [stopScanner]);

  const handleDetection = useCallback(
    (rawValue: string) => {
      const normalized = normalizeRoomValue(rawValue);
      if (!normalized) {
        setStatus('QR code missing room details, try again…');
        return;
      }

      stopScanner();
      setStatus(`Room ${normalized} detected, opening form…`);
      pushNotification({
        title: 'QR detected',
        message: `Room ${normalized} auto-filled in the complaint form.`,
        tone: 'success',
      });
      navigate(ROUTES.complaintForm, { state: { roomNumber: normalized } });
    },
    [navigate, pushNotification, stopScanner],
  );

  const scanFrame = useCallback(() => {
    const detect = async () => {
      if (!detectorRef.current || !videoRef.current || !canvasRef.current) {
        return;
      }

      const video = videoRef.current;
      if (video.readyState < 2) {
        animationRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        animationRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const barcodes = await detectorRef.current.detect(canvas);
        if (barcodes.length && barcodes[0].rawValue) {
          handleDetection(barcodes[0].rawValue);
          return;
        }
      } catch (detectError) {
        setError('Unable to read QR code. Ensure it is well-lit.');
      }

      animationRef.current = requestAnimationFrame(scanFrame);
    };

    detect();
  }, [handleDetection]);

  const startScanner = useCallback(async () => {
    setError('');
    setStatus('Requesting camera access…');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported on this device.');
      setStatus('Use manual entry instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (cameraError) {
      setError('Camera permission denied or unavailable.');
      setStatus('Use manual entry instead.');
      return;
    }

    if (!window.BarcodeDetector) {
      setError('This browser does not support live QR detection. Enter the room manually.');
      setStatus('Awaiting manual input');
      return;
    }

    detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
    setStatus('Align the QR code inside the square.');
    animationRef.current = requestAnimationFrame(scanFrame);
  }, [scanFrame]);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, [startScanner, stopScanner]);

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeRoomValue(manualCode);
    if (!normalized) {
      setError('Enter a valid room code before continuing.');
      return;
    }
    navigate(ROUTES.complaintForm, { state: { roomNumber: normalized } });
  };

  return (
    <section className="space-y-5 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">QR Scan</p>
          <h1 className="mt-1.5 text-xl font-semibold text-neutral-900 sm:mt-2 sm:text-2xl">Scan room QR code</h1>
          <p className="text-xs text-neutral-500 sm:text-sm">Use the camera to capture InfraFlow QR stickers and auto-fill the complaint form.</p>
        </div>
        <button
          type="button"
          onClick={startScanner}
          className="min-h-[42px] rounded-2xl border border-surface-border px-4 py-2 text-sm font-semibold text-neutral-600 sm:min-h-[44px]"
        >
          Restart scanner
        </button>
      </div>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-surface-border bg-black/80 p-3 shadow-soft sm:p-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
            <div className="pointer-events-none absolute inset-6 rounded-[2rem] border-2 border-white/40">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/5 via-transparent to-white/5" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <p className="mt-4 text-sm text-neutral-200">{status}</p>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>

        <div className="rounded-3xl border border-surface-border bg-white p-4 shadow-soft sm:p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Manual fallback</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-900">Enter room code</h2>
          <p className="text-sm text-neutral-500">If the camera cannot scan, type the room number printed under the QR.</p>

          <form className="mt-4 space-y-4" onSubmit={handleManualSubmit}>
            <div>
              <label htmlFor="manualRoom" className="text-sm font-semibold text-neutral-700">
                Room Number
              </label>
              <input
                id="manualRoom"
                className="mt-1 w-full rounded-2xl border border-surface-border px-4 py-3 text-sm font-semibold text-neutral-900"
                placeholder="E.g. LAB-B204"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value.toUpperCase())}
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] w-full rounded-3xl bg-neutral-900 py-3 text-sm font-semibold text-white"
            >
              Open Complaint Form
            </button>
            <p className="text-xs text-neutral-400">
              Tip: Each InfraFlow QR encodes room metadata. Scanning saves time and reduces manual mistakes.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default QrScanner;
