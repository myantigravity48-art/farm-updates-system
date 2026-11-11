"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { emailTheme } from "@/lib/email/email-theme";

export interface EmailPreviewSample {
  label: string;
  subject: string;
  html: string;
  text: string;
}

export function EmailPreview({ samples }: { samples: EmailPreviewSample[] }) {
  return (
    <main className="mx-auto w-full max-w-[900px] space-y-8 pb-24 pt-8 min-[768px]:pt-10">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-light tracking-tight">Email previews</h1>
        <p className="mt-3 text-muted">Sample HTML and plain-text email layouts.</p>
      </header>
      {samples.map((sample) => <EmailPreviewCard key={sample.label} sample={sample} />)}
    </main>
  );
}

function EmailPreviewCard({ sample }: { sample: EmailPreviewSample }) {
  const [width, setWidth] = useState<390 | 720>(720);
  return (
    <section aria-labelledby={`email-${slug(sample.label)}`} className="overflow-hidden rounded-[14px] border border-border bg-surface">
      <div className="border-b border-border p-4">
        <h2 id={`email-${slug(sample.label)}`} className="text-lg font-medium">{sample.label}</h2>
        <p className="mt-3 text-xs text-muted">Subject</p>
        <p className="font-medium">{sample.subject}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-sm text-muted">HTML preview</p>
        <div role="group" aria-label={`${sample.label} preview width`} className="flex gap-2">
          <Button variant={width === 390 ? "primary" : "secondary"} onClick={() => setWidth(390)}>Phone (390)</Button>
          <Button variant={width === 720 ? "primary" : "secondary"} onClick={() => setWidth(720)}>Desktop (720)</Button>
        </div>
      </div>
      <div className="overflow-x-auto p-4" style={{ backgroundColor: emailTheme.card }}>
        <iframe
          title={`${sample.label} HTML email`}
          srcDoc={sample.html}
          sandbox=""
          style={{ display: "block", width, height: 700, maxWidth: "100%", marginInline: "auto", border: 0, backgroundColor: emailTheme.card }}
        />
      </div>
      <div className="border-t border-border p-4">
        <h3 className="text-sm font-medium">Plain text</h3>
        <pre className="mt-3 whitespace-pre-wrap break-words rounded-[10px] border border-border bg-bg p-4 font-mono text-sm leading-6 text-text">{sample.text}</pre>
      </div>
    </section>
  );
}

function slug(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
