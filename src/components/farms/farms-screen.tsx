"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FarmCard } from "@/components/farms/farm-card";
import { FarmDialog } from "@/components/farms/farm-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Toast } from "@/components/ui/toast";
import type { FarmSummary, StageConfig } from "@/lib/data/types";
import { filterFarms } from "@/lib/farms/search";

type Mode = "single" | "bulk";

export function FarmsScreen({
  farms,
  stageConfig,
  error,
  initialQuery = "",
}: {
  farms: FarmSummary[];
  stageConfig: StageConfig;
  error?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("single");
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [syncedQuery, setSyncedQuery] = useState(initialQuery);
  const visibleFarms = useMemo(
    () => filterFarms(farms, query, (farm) => farm.name),
    [farms, query],
  );

  // Keep the input in step with back/forward navigation without an effect.
  if (initialQuery !== syncedQuery) {
    setSyncedQuery(initialQuery);
    setQuery(initialQuery);
  }

  const updateQuery = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value);
    const suffix = params.toString();
    router.replace(suffix ? `/farms?${suffix}` : "/farms", { scroll: false });
  };

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
          <div className="mb-6 flex flex-col gap-3 min-[768px]:mb-8 min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between">
            <div className="flex h-11 w-full max-w-[360px] items-center gap-2 rounded-[10px] border border-border bg-bg px-3 text-muted focus-within:outline focus-within:outline-2 focus-within:outline-primary focus-within:outline-offset-2">
              <Icon icon={Search} />
              <input
                type="search"
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                aria-label="Search farms by name"
                placeholder="Search farms"
                className="min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => openDialog("bulk")}>
                Add several farms at once
              </Button>
              <Button onClick={() => openDialog("single")}>Add farm</Button>
            </div>
          </div>
          {visibleFarms.length === 0 ? (
            <EmptyState
              title="No farms match your search"
              description="Try a different name."
              action={
                <Button variant="secondary" onClick={() => updateQuery("")}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <div className="grid gap-6 min-[640px]:grid-cols-2 min-[768px]:gap-8 min-[1200px]:grid-cols-3">
              {visibleFarms.map((farm) => (
                <FarmCard key={farm.id} farm={farm} />
              ))}
            </div>
          )}
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
