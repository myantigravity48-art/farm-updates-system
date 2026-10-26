import { FarmDetailHeader } from "@/components/farms/farm-detail-header";
import { FarmDetailTabs } from "@/components/farms/farm-detail-tabs";
import { NotesPanel } from "@/components/farms/notes-panel";
import { PhotosPanel } from "@/components/farms/photos-panel";
import { StageTimeline } from "@/components/farms/stage-timeline";
import { getFarmDetail } from "@/lib/data/farm-detail";

export default async function FarmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const farm = await getFarmDetail(id);

  return (
    <>
      <FarmDetailHeader farm={farm} />

      <FarmDetailTabs
        timeline={<StageTimeline rows={farm.stages} />}
        notes={
          <NotesPanel
            farmId={farm.id}
            notes={farm.notes}
            stageOptions={farm.stageOptions}
          />
        }
        photos={
          <PhotosPanel
            farmId={farm.id}
            photos={farm.photos}
            today={farm.today}
            stageOptions={farm.stageOptions}
          />
        }
      />
    </>
  );
}
