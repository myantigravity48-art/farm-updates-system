import { ImageResponse } from "next/og";
import { AppIconMark } from "@/components/brand/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AppIconMark size={180} inset={0.14} />, { ...size });
}
