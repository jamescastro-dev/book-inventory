import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { createBarcodeDetector, describeCameraError, isbnFromBarcodes } from "@/utils/barcode.js";

// Full-screen camera view that reads a book's barcode. Calls onDetected(isbn13) once, then the
// parent closes it, which also stops the camera.
export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  // The camera starts once; it should still call the latest onDetected the parent passed
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  });
  const [message, setMessage] = useState("Starting the camera…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stopped = false;
    let stream;
    let timer;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } }, // the back camera on a phone
          audio: false,
        });
        if (stopped) {
          // closed while the camera was still starting: release it, nobody else will
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        const detector = await createBarcodeDetector();
        if (stopped) return;
        setMessage("Point the camera at the barcode on the back of the book.");

        const scan = async () => {
          if (stopped) return;
          try {
            const isbn = isbnFromBarcodes(await detector.detect(video));
            if (isbn) {
              onDetectedRef.current(isbn);
              return;
            }
          } catch {
            // a frame that can't be read is skipped; the next one may be fine
          }
          timer = setTimeout(scan, 200);
        };
        scan();
      } catch (err) {
        if (stopped) return;
        setFailed(true);
        setMessage(describeCameraError(err));
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan a barcode"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-(--color-surface) rounded-(--radius) shadow-lg border border-(--color-border) overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="relative bg-black aspect-[4/3]">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          {!failed && (
            // a guide for lining the barcode up
            <div aria-hidden="true" className="absolute inset-x-[10%] top-1/2 -translate-y-1/2 h-[28%] border-2 border-white/80 rounded-md">
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500/80" />
            </div>
          )}
        </div>

        <div className="p-4 text-center">
          <p role={failed ? "alert" : "status"} className={`text-sm ${failed ? "text-red-700" : "text-(--color-muted-foreground)"}`}>
            {message}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 px-4 py-2 text-sm rounded-(--radius) font-medium bg-(--color-muted) text-(--color-foreground) hover:bg-(--color-border) transition-colors"
          >
            {failed ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
