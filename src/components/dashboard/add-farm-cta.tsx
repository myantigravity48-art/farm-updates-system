"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FarmDialog } from "@/components/farms/farm-dialog";
import { Button, buttonClass } from "@/components/ui/button";
import type { StageConfig } from "@/lib/data/types";

type Mode = "single" | "bulk";

/**
 * The Dashboard's no-farms invitation. Reuses the shared Add farm dialog;
 * falls back to linking to the Farms page when stage settings cannot load.
 */
export function AddFarmCta({ stageConfig }: { stageConfig: StageConfig | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("single");

  const openDialog = (nextMode: Mode) => {
    setMode(nextMode);
    setOpen(true);
  };

  return (
    <section
      aria-labelledby="no-farms-heading"
      className="rounded-[14px] border border-dashed border-border bg-surface px-6 py-12 text-center"
    >
      <h2 id="no-farms-heading" className="font-display text-3xl font-light">
        Add your first farm
      </h2>
      <p className="mx-auto mt-2 max-w-[420px] text-sm text-muted">
        Each farm gets its own schedule of lifecycle jobs, built from its stage templates.
      </p>
      <div className="mt-6 flex min-h-11 flex-col items-center justify-center gap-3 min-[560px]:flex-row">
        {stageConfig ? (
          <>
            <Button onClick={() => openDialog("single")}>Add farm</Button>
            <button
              type="button"
              onClick={() => openDialog("bulk")}
              className="inline-flex min-h-11 items-center text-sm text-primary hover:underline"
            >
              Add several farms at once
            </button>
          </>
        ) : (
          <>
            <Link href="/farms" className={buttonClass()}>
              Add farm
            </Link>
            <Link
              href="/farms"
              className="inline-flex min-h-11 items-center text-sm text-primary hover:underline"
            >
              Add several farms at once
            </Link>
          </>
        )}
      </div>

      {stageConfig ? (
        <FarmDialog
          open={open}
          initialMode={mode}
          onClose={() => setOpen(false)}
          onAdded={() => router.refresh()}
          stageConfig={stageConfig}
        />
      ) : null}
    </section>
  );
}
