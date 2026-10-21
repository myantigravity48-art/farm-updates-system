import Link from "next/link";
import { Wordmark } from "@/components/auth/wordmark";

// TODO: Real password reset needs custom SMTP. Connect Resend as the Supabase
// custom SMTP provider, then replace this stub with
// supabase.auth.resetPasswordForEmail() and a /reset-password page.
export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-16 lg:px-12">
      <div className="mx-auto w-full max-w-[416px]">
        <Wordmark />

        <h1 className="mt-12 font-display text-[32px] font-light leading-tight">Forgot password</h1>

        <p className="mt-4 text-base text-muted">
          Ask the person who manages this system to reset your password.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-flex min-h-11 items-center rounded text-sm text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
