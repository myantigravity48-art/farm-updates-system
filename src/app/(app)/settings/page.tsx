import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { ConfigError } from "@/components/auth/config-error";
import { signOut } from "@/lib/auth/actions";
import { readSession } from "@/lib/auth/session";
import { LogOut } from "lucide-react";

export default async function SettingsPage() {
  const session = await readSession();

  if (session.status === "signed-out") {
    redirect("/login");
  }

  if (session.status === "missing-config") {
    return <ConfigError variable={session.variable} />;
  }

  return (
    <div className="max-w-[640px]">
      <PageHeader title="Settings" description="Your account and sign in details." />

      <section aria-labelledby="account-heading" className="rounded-[14px] border border-border bg-surface p-6">
        <h2 id="account-heading" className="font-display text-2xl font-light">
          Account
        </h2>

        <div className="mt-6 max-w-[416px]">
          <label htmlFor="account-email" className="mb-2 block text-sm font-medium text-text">
            Signed in email
          </label>
          <input
            id="account-email"
            type="email"
            value={session.user.email}
            readOnly
            autoComplete="username"
            className="h-12 w-full rounded-[10px] border border-border bg-raised px-4 text-base text-muted"
          />
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <h3 className="font-display text-xl font-light">Change password</h3>
          <ChangePasswordForm />
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <form action={signOut}>
            <button
              type="submit"
              className="flex min-h-11 items-center gap-2 rounded-[10px] border border-border px-4 text-sm text-text hover:bg-raised"
            >
              <LogOut aria-hidden="true" size={18} strokeWidth={1.5} />
              Sign out
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
