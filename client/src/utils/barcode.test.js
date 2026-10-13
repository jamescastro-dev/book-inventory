import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canScan, createBarcodeDetector, describeCameraError, isbnFromBarcodes } from "./barcode.js";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

function setGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

afterEach(() => {
  delete globalThis.BarcodeDetector;
  delete globalThis.navigator;
});

describe("isbnFromBarcodes", () => {
  it("picks the book barcode (an EAN-13 starting 978 or 979)", () => {
    assert.equal(isbnFromBarcodes([{ rawValue: "9780547928227" }]), "9780547928227");
    assert.equal(isbnFromBarcodes([{ rawValue: "9791032305690" }]), "9791032305690");
  });

  it("ignores barcodes that are not ISBNs", () => {
    const others = [{ rawValue: "5012345678900" }, { rawValue: "51995" }, { rawValue: "0547928220" }, { rawValue: "97805479282270" }];
    assert.equal(isbnFromBarcodes(others), null);
    assert.equal(isbnFromBarcodes([]), null);
  });

  it("finds the book barcode among others, such as the price add-on printed beside it", () => {
    assert.equal(isbnFromBarcodes([{ rawValue: "51995" }, { rawValue: "9780547928227" }]), "9780547928227");
  });
});

describe("describeCameraError", () => {
  it("explains what to do for each kind of failure", () => {
    assert.match(describeCameraError({ name: "NotAllowedError" }), /blocked/);
    assert.match(describeCameraError({ name: "SecurityError" }), /blocked/);
    assert.match(describeCameraError({ name: "NotFoundError" }), /No camera/);
    assert.match(describeCameraError({ name: "NotReadableError" }), /another app/);
    assert.match(describeCameraError(new Error("???")), /couldn’t be started/);
    assert.match(describeCameraError(undefined), /couldn’t be started/);
  });

  it("always offers typing the ISBN as the way out", () => {
    for (const name of ["NotAllowedError", "NotFoundError", "NotReadableError", "Other"]) {
      assert.match(describeCameraError({ name }), /type the ISBN/i);
    }
  });
});

describe("canScan", () => {
  it("is true only where the browser can open a camera", () => {
    setGlobal("navigator", {});
    assert.equal(canScan(), false);
    setGlobal("navigator", { mediaDevices: { getUserMedia() {} } });
    assert.equal(canScan(), true);
  });
});

describe("createBarcodeDetector", () => {
  it("uses the browser's own detector when it reads EAN-13", async () => {
    let options;
    setGlobal("BarcodeDetector", class {
      static getSupportedFormats() { return Promise.resolve(["qr_code", "ean_13"]); }
      constructor(given) { options = given; }
    });

    const detector = await createBarcodeDetector();

    assert.ok(detector instanceof globalThis.BarcodeDetector);
    assert.deepEqual(options, { formats: ["ean_13"] });
  });
});

describe("the bundled barcode reader", () => {
  it("uses the exact zxing-wasm version that barcode-detector was built against", () => {
    // barcode-detector loads the WebAssembly file we serve (see utils/barcode.js). If the JS and
    // the .wasm come from different versions, scanning breaks without any build error.
    const ours = read("../../package.json");
    const detector = read("../../node_modules/barcode-detector/package.json");
    const wasm = read("../../node_modules/zxing-wasm/package.json");

    assert.equal(ours.dependencies["zxing-wasm"], detector.dependencies["zxing-wasm"]);
    assert.equal(wasm.version, detector.dependencies["zxing-wasm"]);
    assert.match(ours.dependencies["zxing-wasm"], /^\d+\.\d+\.\d+$/, "must be an exact version, not a range");
  });
});
