import { ImageResponse } from "next/og";
import { AppIconMark } from "@/components/brand/app-icon";

export const dynamic = "force-static";

const size = { width: 512, height: 512 };

export function GET() {
  return new ImageResponse(<AppIconMark size={512} inset={0.2} />, { ...size });
}
