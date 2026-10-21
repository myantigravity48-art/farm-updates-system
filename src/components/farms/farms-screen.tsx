"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FarmCard } from "@/components/farms/farm-card";
import { FarmDialog } from "@/components/farms/farm-dialog";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { FarmSummary, StageConfig } from "@/lib/data/types";

type Mode = "single" | "bulk";

export function FarmsScreen({
  farms,
  stageConfig,
  error,
}: {
  farms: FarmSummary[];
  stageConfig: StageConfig;
  error?: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("single");
  const [toast, setToast] = useState<string | null>(null);

  const openDialog = (nextMode: Mode) => {
    setMode(nextMode);
    setDialogOpen(true);
  };

  const handleAdded = (message: string) => {
    setToast(message);
    router.refresh();
  };

  return (
    <>
      {error ? (
        <div
          role="alert"
          className="rounded-[14px] border border-border bg-surface p-6 text-sm text-text"
        >
          {error}
        </div>
      ) : farms.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-border bg-surface px-6 py-12 text-center">
          <h2 className="font-display text-2xl font-light">No farms yet</h2>
          <p className="mt-2 text-sm text-muted">
            Add a plot to start its schedule.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2 min-[560px]:flex-row min-[560px]:justify-center">
            <Button onClick={() => openDialog("single")}>Add farm</Button>
            <Button variant="secondary" onClick={() => openDialog("bulk")}>
              Add several farms at once
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => openDialog("bulk")}>
              Add several farms at once
            </Button>
            <Button onClick={() => openDialog("single")}>Add farm</Button>
          </div>
          <div className="grid gap-4 min-[640px]:grid-cols-2 min-[1200px]:grid-cols-3">
            {farms.map((farm) => (
              <FarmCard key={farm.id} farm={farm} />
            ))}
          </div>
        </>
      )}

      <FarmDialog
        open={dialogOpen}
        initialMode={mode}
        onClose={() => setDialogOpen(false)}
        onAdded={handleAdded}
        stageConfig={stageConfig}
      />

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </>
  );
}
