import { ImageResponse } from "next/og";
import { AppIconMark } from "@/components/brand/app-icon";

export const dynamic = "force-static";

const size = { width: 192, height: 192 };

export function GET() {
  return new ImageResponse(<AppIconMark size={192} inset={0.14} />, { ...size });
}
