"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Mail, Minus, Plus } from "lucide-react";
import { addDays, type CalendarDate } from "@/lib/schedule";
import { renderAlertEmail, renderDoneNotice, type AlertItem } from "@/lib/email/render";
import type { AlertRecipient, AlertsPageData } from "@/lib/data/alerts";
import { validateRecipient, validateTiming, type TimingValues } from "@/lib/alerts/validate";
import { addRecipient, removeRecipient, saveTimingSettings, setRecipientEnabled } from "@/lib/alerts/actions";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

type PreviewChoice = "Digest" | "Heads-up" | "Reminder" | "Overdue" | "Marked done";
const PREVIEW_CHOICES: PreviewChoice[] = ["Digest", "Heads-up", "Reminder", "Overdue", "Marked done"];
const SAMPLE_APP_URL = "https://your-app-address";

export function AlertsScreen({ data }: { data: AlertsPageData }) {
  const router = useRouter();
  const [timing, setTiming] = useState<TimingValues>({
    headsUpDays: data.settings.headsUpDays,
    reminderDays: data.settings.reminderDays,
    overdueEnabled: data.settings.overdueEnabled,
    overdueRepeatDays: data.settings.overdueRepeatDays,
  });
  const [savedTiming, setSavedTiming] = useState(timing);
  const [timingErrors, setTimingErrors] = useState<Record<string, string>>({});
  const [recipientErrors, setRecipientErrors] = useState<Record<string, string>>({});
  const [recipientProblem, setRecipientProblem] = useState("");
  const [preview, setPreview] = useState<PreviewChoice>("Digest");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState("");
  const [pending, startTransition] = useTransition();
  const changed = !sameTiming(timing, savedTiming);
  const validation = validateTiming(timing);
  const previewContent = useMemo(() => buildPreview(preview, timing, data.today), [preview, timing, data.today]);

  function update<K extends keyof TimingValues>(key: K, value: TimingValues[K]) {
    setTiming((current) => ({ ...current, [key]: value }));
    setTimingErrors({});
  }

  function saveTiming() {
    if (!validation.ok) {
      setTimingErrors(validation.errors);
      return;
    }
    startTransition(async () => {
      const result = await saveTimingSettings(timing);
      if (!result.ok) {
        setTimingErrors(result.errors ?? {});
        setRecipientProblem(result.message);
        return;
      }
      setSavedTiming(timing);
      setTimingErrors({});
      setRecipientProblem("");
      setToast("Settings saved");
      router.refresh();
    });
  }

  function submitRecipient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const localValidation = validateRecipient({ name, email }, data.recipients.length);
    if (!localValidation.ok) {
      setRecipientErrors(localValidation.errors);
      return;
    }
    startTransition(async () => {
      const result = await addRecipient({ name, email });
      if (!result.ok) {
        setRecipientErrors(result.errors ?? {});
        setRecipientProblem(result.message);
        return;
      }
      setDialogOpen(false);
      setName("");
      setEmail("");
      setRecipientErrors({});
      setRecipientProblem("");
      setToast("Recipient added");
      router.refresh();
    });
  }

  function toggleRecipient(recipient: AlertRecipient) {
    startTransition(async () => {
      const result = await setRecipientEnabled(recipient.id, !recipient.enabled);
      if (!result.ok) setRecipientProblem(result.message);
      else {
        setRecipientProblem("");
        router.refresh();
      }
    });
  }

  function deleteRecipient(recipient: AlertRecipient) {
    if (!window.confirm(`This deletes ${recipient.name}'s alert history. To pause their emails, turn them off instead.`)) return;
    startTransition(async () => {
      const result = await removeRecipient(recipient.id);
      if (!result.ok) setRecipientProblem(result.message);
      else {
        setRecipientProblem("");
        setToast("Recipient removed");
        router.refresh();
      }
    });
  }

  const nobody = data.recipients.length === 0 || data.recipients.every((recipient) => !recipient.enabled);

  return (
    <main className="mx-auto w-full max-w-[720px] pb-24 pt-8 min-[768px]:pt-10">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-light tracking-tight">Alerts</h1>
        <p className="mt-3 text-muted">Choose who receives email alerts and when they arrive.</p>
      </header>

      <div className="space-y-8">
        <section aria-labelledby="recipients-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="recipients-title" className="text-xl font-medium">Recipients</h2>
              <p className="mt-1 text-sm text-muted">Email alerts go to the people on this list.</p>
            </div>
            <Button variant="secondary" onClick={() => { setDialogOpen(true); setRecipientErrors({}); }} disabled={data.recipients.length >= 10}>
              <Plus aria-hidden="true" size={18} /> Add recipient
            </Button>
          </div>

          {recipientProblem ? <p role="alert" aria-live="polite" className="mb-3 rounded-[10px] border border-overdue/40 bg-overdue/10 px-4 py-3 text-sm">{recipientProblem}</p> : null}
          {nobody ? <InlineNotice>No one will receive alerts. Add a recipient or turn one on.</InlineNotice> : null}
          {data.recipients.length ? (
            <ul className="divide-y divide-border rounded-[14px] border border-border bg-surface">
              {data.recipients.map((recipient) => <RecipientRow key={recipient.id} recipient={recipient} pending={pending} onToggle={toggleRecipient} onRemove={deleteRecipient} />)}
            </ul>
          ) : null}
        </section>

        <section aria-labelledby="timing-title">
          <div className="mb-4">
            <h2 id="timing-title" className="text-xl font-medium">Timing</h2>
            <p className="mt-1 text-sm text-muted">Set how far ahead reminders begin.</p>
          </div>
          <div className="space-y-4 rounded-[14px] border border-border bg-surface p-4 min-[768px]:p-5">
            <NumberStepper label="Heads-up, days before" value={timing.headsUpDays} error={timingErrors.headsUpDays} min={1} max={60} onChange={(value) => update("headsUpDays", value)} />
            <NumberStepper label="Reminder, days before" value={timing.reminderDays} error={timingErrors.reminderDays} min={0} max={30} onChange={(value) => update("reminderDays", value)} />
            <div className="border-t border-border pt-4">
              <Switch checked={timing.overdueEnabled} label="Send overdue emails" onChange={(value) => update("overdueEnabled", value)} />
            </div>
            <NumberStepper label="Repeat overdue emails every n days" value={timing.overdueRepeatDays} error={timingErrors.overdueRepeatDays} min={1} max={30} disabled={!timing.overdueEnabled} onChange={(value) => update("overdueRepeatDays", value)} />
            {timingErrors.overdueEnabled ? <p role="alert" className="text-sm text-overdue">{timingErrors.overdueEnabled}</p> : null}
            <p className="border-t border-border pt-4 text-sm text-muted">Alerts send at {data.settings.sendHourLondon}:00 UK time</p>
            {timingErrors.reminderDays ? <p role="alert" className="text-sm text-overdue">{timingErrors.reminderDays}</p> : null}
            {recipientProblem && timingErrors.reminderDays === undefined ? <p role="alert" aria-live="polite" className="text-sm text-overdue">{recipientProblem}</p> : null}
            <Button className="w-full min-[768px]:w-auto" onClick={saveTiming} disabled={!changed || pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </section>

        <section aria-labelledby="preview-title">
          <div className="mb-4">
            <h2 id="preview-title" className="text-xl font-medium">Email preview</h2>
            <p className="mt-1 text-sm text-muted">Sample data</p>
          </div>
          <div role="tablist" aria-label="Email preview type" className="mb-3 flex flex-wrap gap-1 rounded-[12px] border border-border bg-raised p-1">
            {PREVIEW_CHOICES.map((choice) => (
              <button key={choice} type="button" role="tab" aria-selected={preview === choice} onClick={() => setPreview(choice)} className={`min-h-11 rounded-[9px] px-3 text-sm ${preview === choice ? "bg-surface text-text" : "text-muted hover:text-text"}`}>
                {choice}
              </button>
            ))}
          </div>
          <article className="overflow-hidden rounded-[14px] border border-border bg-surface">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary"><Mail aria-hidden="true" size={18} /></span>
              <div className="min-w-0"><p className="text-xs text-muted">Subject</p><p className="font-medium">{previewContent.subject}</p></div>
            </div>
            <pre className="whitespace-pre-wrap break-words px-4 py-4 font-mono text-sm leading-6 text-text">{previewContent.text}</pre>
          </article>
          <p className="mt-3 text-sm text-muted">Real emails also have a button and a nicer layout.</p>
        </section>
      </div>

      {dialogOpen ? (
        <Modal onClose={() => setDialogOpen(false)} labelledBy="add-recipient-title">
          <div className="overflow-y-auto p-6 pt-14">
            <h2 id="add-recipient-title" className="text-xl font-medium">Add recipient</h2>
            <p className="mt-2 text-sm text-muted">Add a name and email address for alerts.</p>
            <form className="mt-5 space-y-4" onSubmit={submitRecipient} noValidate>
              <div aria-live="polite" aria-atomic="true">
                {Object.keys(recipientErrors).length || recipientProblem ? <div className="rounded-[10px] border border-overdue/40 bg-overdue/10 p-3 text-sm text-text"><p className="font-medium">Check these details</p><ul className="mt-1 list-inside list-disc">{Object.values(recipientErrors).map((message) => <li key={message}>{message}</li>)}{recipientProblem ? <li>{recipientProblem}</li> : null}</ul></div> : null}
              </div>
              <label className="block text-sm font-medium" htmlFor="recipient-name">Name</label>
              <input id="recipient-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoComplete="name" className="-mt-2 min-h-11 w-full rounded-[10px] border border-border bg-bg px-3 text-text" aria-invalid={Boolean(recipientErrors.name)} aria-describedby={recipientErrors.name ? "recipient-name-error" : undefined} />
              {recipientErrors.name ? <p id="recipient-name-error" className="-mt-3 text-sm text-overdue">{recipientErrors.name}</p> : null}
              <label className="block text-sm font-medium" htmlFor="recipient-email">Email</label>
              <input id="recipient-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" className="-mt-2 min-h-11 w-full rounded-[10px] border border-border bg-bg px-3 text-text" aria-invalid={Boolean(recipientErrors.email)} aria-describedby={recipientErrors.email ? "recipient-email-error" : undefined} />
              {recipientErrors.email ? <p id="recipient-email-error" className="-mt-3 text-sm text-overdue">{recipientErrors.email}</p> : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={pending}>Cancel</Button>
                <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add recipient"}</Button>
              </div>
            </form>
          </div>
        </Modal>
      ) : null}
      {toast ? <Toast message={toast} onDismiss={() => setToast("")} /> : null}
    </main>
  );
}

function RecipientRow({ recipient, pending, onToggle, onRemove }: { recipient: AlertRecipient; pending: boolean; onToggle: (recipient: AlertRecipient) => void; onRemove: (recipient: AlertRecipient) => void }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 min-[520px]:flex-nowrap">
      <div className="min-w-0 flex-1"><p className="truncate font-medium">{recipient.name}</p><p className="truncate text-sm text-muted">{recipient.email}</p></div>
      <Switch checked={recipient.enabled} label={`Send alerts to ${recipient.name}`} onChange={() => onToggle(recipient)} disabled={pending} compact />
      <button type="button" onClick={() => onRemove(recipient)} disabled={pending} className="min-h-11 rounded-[10px] px-3 text-sm text-muted hover:bg-raised hover:text-text">Remove</button>
    </li>
  );
}

function Switch({ checked, label, onChange, disabled = false, compact = false }: { checked: boolean; label: string; onChange: (value: boolean) => void; disabled?: boolean; compact?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={`inline-flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-sm disabled:opacity-50 ${compact ? "" : "w-full justify-between"}`}>
      {compact ? null : <span>{label}</span>}
      <span aria-hidden="true" className={`relative h-6 w-11 rounded-full border border-border transition-colors ${checked ? "bg-primary" : "bg-raised"}`}><span className={`absolute top-[3px] h-4 w-4 rounded-full bg-surface transition-transform ${checked ? "translate-x-[23px]" : "translate-x-[3px]"}`} /></span>
      <span className="sr-only">{checked ? "On" : "Off"}</span>
    </button>
  );
}

function NumberStepper({ label, value, error, min, max, disabled, onChange }: { label: string; value: number; error?: string; min: number; max: number; disabled?: boolean; onChange: (value: number) => void }) {
  const inputId = `setting-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${disabled ? "opacity-50" : ""}`}>
      <div className="min-w-[180px] flex-1"><label htmlFor={inputId} className="text-sm font-medium">{label}</label>{error ? <p role="alert" className="mt-1 text-sm text-overdue">{error}</p> : null}</div>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Decrease ${label}`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)} className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-border bg-bg text-text disabled:opacity-40"><Minus aria-hidden="true" size={18} /></button>
        <input id={inputId} type="number" min={min} max={max} step={1} value={Number.isFinite(value) ? value : ""} disabled={disabled} onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))} aria-invalid={Boolean(error)} className="h-11 w-[72px] rounded-[10px] border border-border bg-bg text-center text-text" />
        <button type="button" aria-label={`Increase ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-border bg-bg text-text disabled:opacity-40"><Plus aria-hidden="true" size={18} /></button>
      </div>
    </div>
  );
}

function InlineNotice({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 flex items-start gap-2 rounded-[10px] border border-due-soon/40 bg-due-soon/10 px-4 py-3 text-sm"><AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-due-soon" size={18} /><span>{children}</span></p>;
}

function sameTiming(a: TimingValues, b: TimingValues): boolean {
  return a.headsUpDays === b.headsUpDays && a.reminderDays === b.reminderDays && a.overdueEnabled === b.overdueEnabled && a.overdueRepeatDays === b.overdueRepeatDays;
}

function buildPreview(choice: PreviewChoice, timing: TimingValues, today: CalendarDate) {
  const headsUpDays = safeTiming(timing.headsUpDays, 14);
  const reminderDays = safeTiming(timing.reminderDays, 3);
  const overdueDays = safeTiming(timing.overdueRepeatDays, 3);
  const alert = (type: AlertItem["type"], farmId: string, farmName: string, stageName: string, days: number, kind: AlertItem["kind"] = "date"): AlertItem => ({
    type, farmId, farmName, stageName, kind,
    date: type === "overdue" ? addDays(today, -days) : addDays(today, days),
    ...(kind === "window" ? { windowEnd: type === "overdue" ? addDays(today, -days + 4) : addDays(today, days + 4) } : {}),
    days,
  });

  if (choice === "Marked done") return renderDoneNotice({ farmName: "Iyanuole", stageName: "Second round-weeding", doneByName: "Obi", doneDate: today, nextStageName: "Land clearing", nextDate: addDays(today, timing.headsUpDays), nextHasNoDate: false, isLastStage: false, appUrl: SAMPLE_APP_URL });
  const item = choice === "Heads-up"
    ? alert("heads_up", "sample-iyanuole", "Iyanuole", "Second round-weeding", headsUpDays, "window")
    : choice === "Reminder"
      ? alert("reminder", "sample-obi", "Obi-Umuagbogho", "Land clearing", reminderDays)
      : choice === "Overdue"
        ? alert("overdue", "sample-obaoba", "Obaoba", "First fertilizer", overdueDays)
        : null;
  const alerts = item ? [item] : [
    alert("overdue", "sample-obi", "Obi-Umuagbogho", "Land clearing", overdueDays, "window"),
    alert("reminder", "sample-iyanuole", "Iyanuole", "Second round-weeding", reminderDays),
    alert("heads_up", "sample-obaoba", "Obaoba", "First fertilizer", headsUpDays),
  ];
  return renderAlertEmail({ alerts, today, appUrl: SAMPLE_APP_URL });
}

function safeTiming(value: number, fallback: number): number {
  return Number.isInteger(value) ? value : fallback;
}
