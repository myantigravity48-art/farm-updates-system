import { describe, expect, it } from "vitest";
import { PHOTO_MAX_SIDE, scaledImageSize } from "./image-size";

describe("scaledImageSize", () => {
  it("shrinks a landscape image so the longest side is 1600", () => {
    expect(scaledImageSize(3200, 2400)).toEqual({ width: 1600, height: 1200 });
  });

  it("shrinks a portrait image so the longest side is 1600", () => {
    expect(scaledImageSize(2400, 3200)).toEqual({ width: 1200, height: 1600 });
  });

  it("shrink-wraps a wide panorama", () => {
    expect(scaledImageSize(4000, 1000)).toEqual({ width: 1600, height: 400 });
  });

  it("leaves an image already on the limit unchanged", () => {
    expect(scaledImageSize(1600, 1200)).toEqual({ width: 1600, height: 1200 });
  });

  it("never upscales a smaller image", () => {
    expect(scaledImageSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("leaves a tiny image unchanged", () => {
    expect(scaledImageSize(40, 20)).toEqual({ width: 40, height: 20 });
    expect(scaledImageSize(1, 1)).toEqual({ width: 1, height: 1 });
  });

  it("keeps at least one pixel on each side", () => {
    const size = scaledImageSize(3200, 1);
    expect(size.width).toBe(PHOTO_MAX_SIDE);
    expect(size.height).toBe(1);
  });

  it("uses a custom maximum side", () => {
    expect(scaledImageSize(1000, 500, 800)).toEqual({ width: 800, height: 400 });
  });

  it("returns zero for invalid dimensions", () => {
    expect(scaledImageSize(0, 100)).toEqual({ width: 0, height: 0 });
    expect(scaledImageSize(Number.NaN, 100)).toEqual({ width: 0, height: 0 });
  });
});
