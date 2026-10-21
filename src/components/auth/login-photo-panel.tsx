import Image from "next/image";
import { loginPhotoExists } from "@/lib/auth/login-photo";

/**
 * Right-hand panel on desktop. The moss photograph is picked up from
 * public/login-moss.jpg when the file exists; otherwise the panel is built
 * from the --raised token. Never crop the photo out of a mockup.
 */
export function LoginPhotoPanel() {
  const hasPhoto = loginPhotoExists();

  return (
    <div className="relative hidden overflow-hidden border-l border-border bg-raised lg:block">
      {hasPhoto ? (
        <Image
          src="/login-moss.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
      ) : null}

      {hasPhoto ? (
        <div aria-hidden="true" className="absolute inset-0 bg-[var(--photo-overlay)]" />
      ) : null}

      <p
        className={`absolute inset-x-0 bottom-0 p-12 font-display text-[32px] font-light leading-tight ${
          hasPhoto ? "text-[color:var(--on-photo)]" : "text-text"
        }`}
      >
        Know what&apos;s due before it&apos;s late.
      </p>
    </div>
  );
}
