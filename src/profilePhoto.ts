export async function squarePhoto(file: File, size: number): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG or WebP image.");
  }
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This device could not resize the image.");
    const crop = Math.min(image.width, image.height);
    ctx.drawImage(
      image,
      (image.width - crop) / 2,
      (image.height - crop) / 2,
      crop,
      crop,
      0,
      0,
      size,
      size,
    );
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    image.close();
  }
}
