"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FarmCard } from "@/components/farms/farm-card";
import { FarmDialog } from "@/components/farms/farm-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
        <EmptyState
          title="No farms yet"
          description="Add a plot to start its schedule."
          action={
            <>
              <Button onClick={() => openDialog("single")}>Add farm</Button>
              <Button variant="secondary" onClick={() => openDialog("bulk")}>
                Add several farms at once
              </Button>
            </>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-end gap-2 min-[768px]:mb-8">
            <Button variant="secondary" onClick={() => openDialog("bulk")}>
              Add several farms at once
            </Button>
            <Button onClick={() => openDialog("single")}>Add farm</Button>
          </div>
          <div className="grid gap-6 min-[640px]:grid-cols-2 min-[768px]:gap-8 min-[1200px]:grid-cols-3">
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
