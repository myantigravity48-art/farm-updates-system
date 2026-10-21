import { FarmsScreen } from "@/components/farms/farms-screen";
import { PageHeader } from "@/components/page-header";
import { getFarmSummaries, getStageConfig } from "@/lib/data/farms";
import type { StageConfig } from "@/lib/data/types";

export default async function FarmsPage() {
  const [farmResult, stageResult] = await Promise.allSettled([
    getFarmSummaries(),
    getStageConfig(),
  ]);

  const farms = farmResult.status === "fulfilled" ? farmResult.value : [];
  const stageConfig: StageConfig =
    stageResult.status === "fulfilled"
      ? stageResult.value
      : { stages: [], plantingPosition: 1 };
  const error =
    farmResult.status === "rejected"
      ? "Could not load farms. Refresh the page to try again."
      : undefined;

  return (
    <>
      <PageHeader title="Farms" description="Every plot and where it is in the process." />
      <FarmsScreen farms={farms} stageConfig={stageConfig} error={error} />
    </>
  );
}
