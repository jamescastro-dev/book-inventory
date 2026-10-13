// A barcode detector that works in this browser. Chrome on Android (and some desktops) have one
// built in; elsewhere (iPhone Safari, Windows) a WebAssembly one stands in. It is loaded only when
// someone scans, so the ~1 MB file costs nothing otherwise, and it is served with the app instead
// of from a CDN.
export async function createBarcodeDetector() {
  const native = globalThis.BarcodeDetector;
  if (native) {
    const formats = (await native.getSupportedFormats?.()) ?? ["ean_13"];
    if (formats.includes("ean_13")) return new native({ formats: ["ean_13"] });
  }

  const [{ BarcodeDetector, setZXingModuleOverrides }, { default: wasmUrl }] = await Promise.all([
    import("barcode-detector/ponyfill"),
    import("zxing-wasm/reader/zxing_reader.wasm?url"),
  ]);
  setZXingModuleOverrides({
    locateFile: (path, prefix) => (path.endsWith(".wasm") ? wasmUrl : prefix + path),
  });
  return new BarcodeDetector({ formats: ["ean_13"] });
}

// The ISBN-13 among the barcodes a detector found. A book's barcode is an EAN-13 that starts 978 or 979.
export function isbnFromBarcodes(barcodes) {
  const found = barcodes.find((barcode) => /^97[89]\d{10}$/.test(barcode.rawValue));
  return found ? found.rawValue : null;
}

// A message a person can act on when the camera can't be started.
export function describeCameraError(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow it in your browser’s site settings, or type the ISBN instead.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device. Type the ISBN instead.";
    case "NotReadableError":
      return "The camera is being used by another app. Close it and try again, or type the ISBN instead.";
    default:
      return "The camera couldn’t be started. Type the ISBN instead.";
  }
}

// Scanning needs a camera and a secure page (https or localhost); without them the button is hidden.
export function canScan() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}
