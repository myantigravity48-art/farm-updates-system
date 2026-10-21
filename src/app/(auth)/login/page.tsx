import { LoginForm } from "@/components/auth/login-form";
import { LoginPhotoPanel } from "@/components/auth/login-photo-panel";
import { Wordmark } from "@/components/auth/wordmark";
import { safeNextPath } from "@/lib/auth/next-path";

export const instant = false;

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-16 lg:px-12">
        <div className="mx-auto w-full max-w-[416px]">
          <Wordmark />

          <h1 className="mt-12 font-display text-[32px] font-light leading-tight">Sign in</h1>

          <LoginForm nextPath={safeNextPath(next)} />
        </div>
      </div>

      <LoginPhotoPanel />
    </main>
  );
}
