export const PHOTO_MAX_SIDE = 1600;

export interface ImageSize {
  width: number;
  height: number;
}

/**
 * Shrinks an image so its longest side is at most maxSide, keeping the aspect
 * ratio. Images already within the limit are returned unchanged, never upscaled.
 * Pure: the browser does the actual canvas resize with this result.
 */
export function scaledImageSize(
  width: number,
  height: number,
  maxSide: number = PHOTO_MAX_SIDE,
): ImageSize {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    maxSide <= 0
  ) {
    return { width: 0, height: 0 };
  }

  const longest = Math.max(width, height);
  if (longest <= maxSide) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
