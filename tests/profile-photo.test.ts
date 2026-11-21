import { test } from "node:test";
import assert from "node:assert/strict";
import {
  centeredPhoto,
  croppedJpeg,
  cropRect,
  drawPhoto,
  panPhoto,
  readPhoto,
  squarePhoto,
} from "../src/profilePhoto";
import { validateProfile } from "../src/model";

test("portrait and landscape crops center correctly and stay inside the photo at every zoom", () => {
  assert.deepEqual(cropRect(600, 800, centeredPhoto), {
    left: 0,
    top: 100,
    side: 600,
  });
  assert.deepEqual(cropRect(800, 600, centeredPhoto), {
    left: 100,
    top: 0,
    side: 600,
  });
  for (const zoom of [1, 1.5, 3]) {
    const initial = { ...centeredPhoto, zoom };
    for (const [w, h] of [
      [300, 1800],
      [1800, 300],
      [300, 300],
    ]) {
      for (const [dx, dy] of [
        [100, 100],
        [-100, -100],
        [0.12, -0.24],
      ]) {
        const crop = cropRect(w, h, panPhoto(w, h, initial, dx, dy));
        assert.ok(crop.left >= 0 && crop.top >= 0);
        assert.ok(crop.left + crop.side <= w && crop.top + crop.side <= h);
        assert.equal(crop.side, Math.min(w, h) / zoom);
      }
    }
  }
});

test("save and preview render the same crop; saved avatars use a valid small JPEG", (t) => {
  const draws: unknown[][] = [];
  const canvas = (size: number) => ({
    width: size,
    height: size,
    getContext: () => ({
      fillRect() {},
      drawImage(...args: unknown[]) {
        draws.push(args);
      },
    }),
    toDataURL: (type: string, quality: number) => {
      assert.equal(type, "image/jpeg");
      assert.equal(quality, 0.8);
      return "data:image/jpeg;base64,/9j/2Q==";
    },
  });
  const before = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => canvas(0) },
  });
  t.after(() => {
    if (before) Object.defineProperty(globalThis, "document", before);
    else Reflect.deleteProperty(globalThis, "document");
  });
  const image = { naturalWidth: 840, naturalHeight: 600 } as HTMLImageElement;
  const crop = { zoom: 2, x: 0.2, y: 0.8 };
  drawPhoto(canvas(320) as unknown as HTMLCanvasElement, image, crop);
  const data = croppedJpeg(image, crop, 128);
  assert.deepEqual(draws[0].slice(0, 5), draws[1].slice(0, 5));
  assert.deepEqual(draws[1].slice(5), [0, 0, 128, 128]);
  assert.equal(
    validateProfile(
      { id: "tutor@example.com", photo: data },
      "tutor@example.com",
    ),
    null,
  );
});

test("gallery rejects unsupported files before allocating an object URL, and releases URLs for broken images", async (t) => {
  const create = t.mock.method(URL, "createObjectURL", () => "blob:photo");
  const release = t.mock.method(URL, "revokeObjectURL", () => {});
  await assert.rejects(
    readPhoto(new File(["bad"], "vector.svg", { type: "image/svg+xml" })),
    /Choose a JPEG/,
  );
  assert.equal(create.mock.callCount(), 0);
  const before = Object.getOwnPropertyDescriptor(globalThis, "Image");
  class BrokenImage {
    onerror?: () => void;
    set src(_src: string) {
      this.onerror?.();
    }
  }
  Object.defineProperty(globalThis, "Image", {
    configurable: true,
    value: BrokenImage,
  });
  t.after(() => {
    if (before) Object.defineProperty(globalThis, "Image", before);
    else Reflect.deleteProperty(globalThis, "Image");
  });
  await assert.rejects(
    squarePhoto(new File(["bad"], "photo.jpeg", { type: "image/jpeg" }), 256),
    /could not read/,
  );
  assert.equal(release.mock.callCount(), 1);
  assert.deepEqual(release.mock.calls[0].arguments, ["blob:photo"]);
});
