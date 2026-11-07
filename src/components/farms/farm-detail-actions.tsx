"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EditFarmDialog, type EditableFarm } from "@/components/farms/edit-farm-dialog";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { useMarkDone } from "@/components/mark-done/mark-done-provider";

export function FarmDetailActions({ farm, nextStageId, allStagesDone }: { farm: EditableFarm; nextStageId: string | null; allStagesDone: boolean }) {
  const router = useRouter();
  const { openMarkDone } = useMarkDone();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      {allStagesDone ? <span className="inline-flex min-h-11 items-center px-4 text-sm text-muted">All stages done</span> : <Button onClick={() => openMarkDone(nextStageId)}>Mark done</Button>}
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Edit farm
      </Button>
      <EditFarmDialog
        open={open}
        farm={farm}
        onClose={() => setOpen(false)}
          onSaved={(message) => {
          setToast(message);
          router.refresh();
        }}
      />
      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </>
  );
}
