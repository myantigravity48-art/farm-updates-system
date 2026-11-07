"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { hintTextClass, inputClass, labelClass } from "@/components/ui/form-styles";
import { saveDisplayName, type DisplayNameState } from "@/lib/settings/actions";
import { DISPLAY_NAME_MAX } from "@/lib/settings/display-name";

const initialDisplayNameState: DisplayNameState = { status: "idle" };

export function DisplayNameForm({ initialName }: { initialName: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initialName ?? "");
  const [state, action, pending] = useActionState(
    saveDisplayName,
    initialDisplayNameState,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="mt-4 w-full">
      <label htmlFor="display-name" className={labelClass}>
        Display name
      </label>
      <input
        id="display-name"
        name="displayName"
        type="text"
        required
        maxLength={DISPLAY_NAME_MAX}
        autoComplete="nickname"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={inputClass}
        aria-describedby="display-name-hint"
      />
      <p id="display-name-hint" className={`mt-2 ${hintTextClass}`}>
        {value.trim().length} of {DISPLAY_NAME_MAX} characters. Shown on notes and
        photos, and in the Dashboard greeting.
      </p>

      <div className="mt-4">
        <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save name"}
        </Button>
      </div>

      <div aria-live="polite" aria-atomic="true" className="min-h-0">
        {state.message ? (
          <p
            className={`mt-3 text-sm ${
              state.status === "error" ? "text-overdue" : "text-primary"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
