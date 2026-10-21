"use client";

import { AlertCircle, Check } from "lucide-react";
import { useActionState, useId } from "react";
import { changePassword } from "@/lib/auth/actions";
import { initialChangePasswordState } from "@/lib/auth/types";

const fieldClasses =
  "h-12 w-full rounded-[10px] border border-border bg-raised px-4 text-base text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function ChangePasswordForm() {
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const [state, formAction, pending] = useActionState(changePassword, initialChangePasswordState);
  const isError = state.status === "error";
  const isSuccess = state.status === "success";

  return (
    <form action={formAction} className="mt-4 max-w-[416px]">
      <div>
        <label htmlFor={newPasswordId} className="mb-2 block text-sm font-medium text-text">
          New password
        </label>
        <input
          id={newPasswordId}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={isError || undefined}
          className={`${fieldClasses} ${isError ? "border-overdue" : ""}`}
        />
      </div>

      <div className="mt-5">
        <label htmlFor={confirmPasswordId} className="mb-2 block text-sm font-medium text-text">
          Confirm password
        </label>
        <input
          id={confirmPasswordId}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={isError || undefined}
          className={`${fieldClasses} ${isError ? "border-overdue" : ""}`}
        />
      </div>

      <p className="mt-2 text-sm text-muted">Use at least 12 characters.</p>

      <div aria-live="polite" aria-atomic="true" className="min-h-0">
        {state.message ? (
          <p className={`mt-3 flex items-start gap-2 text-sm ${isError ? "text-overdue" : "text-primary"}`}>
            {isError ? (
              <AlertCircle aria-hidden="true" size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            ) : isSuccess ? (
              <Check aria-hidden="true" size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            ) : null}
            <span>{state.message}</span>
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-5 flex h-11 items-center justify-center rounded-[10px] bg-primary px-5 text-sm font-medium text-on-primary disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Changing password…" : "Change password"}
      </button>
    </form>
  );
}
