export type PhotoCrop = { zoom: number; x: number; y: number };
export const centeredPhoto: PhotoCrop = { zoom: 1, x: 0.5, y: 0.5 };

const fraction = (value: number) => Math.max(0, Math.min(1, value));

export function cropRect(width: number, height: number, crop: PhotoCrop) {
  const side = Math.min(width, height) / Math.max(1, Math.min(3, crop.zoom));
  return {
    left: fraction(crop.x) * (width - side),
    top: fraction(crop.y) * (height - side),
    side,
  };
}

// Drag distances are fractions of the displayed square, independent of screen density.
export function panPhoto(
  width: number,
  height: number,
  crop: PhotoCrop,
  dx: number,
  dy: number,
): PhotoCrop {
  const { side } = cropRect(width, height, crop);
  return {
    zoom: crop.zoom,
    x: width > side ? fraction(crop.x - (dx * side) / (width - side)) : crop.x,
    y:
      height > side ? fraction(crop.y - (dy * side) / (height - side)) : crop.y,
  };
}

export async function readPhoto(file: File): Promise<HTMLImageElement> {
  if (
    (file.type && !/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) ||
    (!file.type && !/\.(jpe?g|png|webp|hei[cf])$/i.test(file.name))
  ) {
    throw new Error("Choose a JPEG, PNG or WebP photo.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          new Error("This device could not read the photo. Try a JPEG or PNG."),
        );
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function drawPhoto(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  crop: PhotoCrop,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This device could not resize the photo.");
  const { left, top, side } = cropRect(
    image.naturalWidth,
    image.naturalHeight,
    crop,
  );
  // JPEG has no transparency. Give camera and gallery previews the same background.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    image,
    left,
    top,
    side,
    side,
    0,
    0,
    canvas.width,
    canvas.height,
  );
}

export function croppedJpeg(
  image: HTMLImageElement,
  crop: PhotoCrop,
  size: number,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  drawPhoto(canvas, image, crop);
  const data = canvas.toDataURL("image/jpeg", 0.8);
  if (!data.startsWith("data:image/jpeg;base64,"))
    throw new Error("This device could not create a JPEG photo.");
  return data;
}

export async function squarePhoto(file: File, size: number): Promise<string> {
  return croppedJpeg(await readPhoto(file), centeredPhoto, size);
}
