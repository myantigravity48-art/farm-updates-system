"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EditFarmDialog, type EditableFarm } from "@/components/farms/edit-farm-dialog";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

export function FarmDetailActions({ farm }: { farm: EditableFarm }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
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
