import { scaledImageSize } from "./image-size";

/** Thrown when the browser cannot decode the file as an image. */
export class PhotoDecodeError extends Error {
  constructor() {
    super("The browser could not decode this image.");
    this.name = "PhotoDecodeError";
  }
}

/**
 * Shrinks an image in the browser so its longest side is at most 1600px, then
 * re-encodes it as JPEG at quality 0.8. Runs only in the browser.
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoDecodeError();
  }

  try {
    const size = scaledImageSize(bitmap.width, bitmap.height);
    if (size.width <= 0 || size.height <= 0) throw new PhotoDecodeError();

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d");
    if (!context) throw new PhotoDecodeError();

    context.drawImage(bitmap, 0, 0, size.width, size.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.8);
    });

    if (!blob) throw new PhotoDecodeError();
    return blob;
  } finally {
    bitmap.close();
  }
}
