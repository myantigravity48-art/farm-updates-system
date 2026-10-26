import type { FarmPhoto } from "@/lib/data/types";
import { formatUkDate } from "@/lib/format/dates";

/** Alt text from the caption, or the taken-on date when the caption is empty. */
export function photoAltText(photo: Pick<FarmPhoto, "caption" | "takenOn">): string {
  const caption = photo.caption?.trim();
  if (caption) return caption;
  return photo.takenOn
    ? `Farm photo from ${formatUkDate(photo.takenOn)}`
    : "Farm photo";
}
