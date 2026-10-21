"use client";

import Link from "next/link";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { signIn } from "@/lib/auth/actions";
import { initialSignInState } from "@/lib/auth/types";

const fieldClasses =
  "h-12 w-full rounded-[10px] border bg-raised px-4 text-base text-text placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const emailId = useId();
  const passwordId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(signIn, initialSignInState);
  const hasError = Boolean(state.error);

  return (
    <form action={formAction} className="mt-7">
      <input type="hidden" name="next" value={nextPath} />

      <div>
        <label htmlFor={emailId} className="mb-2 block text-sm font-medium text-text">
          Email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={hasError || undefined}
          className={`${fieldClasses} ${hasError ? "border-overdue" : "border-border"}`}
        />
      </div>

      <div className="mt-5">
        <label htmlFor={passwordId} className="mb-2 block text-sm font-medium text-text">
          Password
        </label>
        <div className="relative">
          <input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={hasError || undefined}
            className={`${fieldClasses} pr-12 ${hasError ? "border-overdue" : "border-border"}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[10px] text-muted hover:text-text"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" size={20} strokeWidth={1.5} />
            ) : (
              <Eye aria-hidden="true" size={20} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      <div aria-live="assertive" aria-atomic="true" className="min-h-0">
        {state.error ? (
          <p className="mt-4 flex items-start gap-2 text-sm text-overdue">
            <AlertCircle aria-hidden="true" size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-7 flex h-12 w-full items-center justify-center rounded-[10px] bg-primary px-6 font-medium text-on-primary disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <div className="mt-2">
        <Link
          href="/forgot-password"
          className="inline-flex min-h-11 items-center rounded text-sm text-muted underline-offset-4 hover:text-text hover:underline"
        >
          Forgot password
        </Link>
      </div>
    </form>
  );
}
