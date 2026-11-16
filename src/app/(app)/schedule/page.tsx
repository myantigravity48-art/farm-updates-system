import { MarkDoneProvider } from "@/components/mark-done/mark-done-provider";
import { ScheduleScreen } from "@/components/schedule/schedule-screen";
import { getSchedulePageData } from "@/lib/data/schedule-page";
import { buildSchedulePage, parseScheduleFilters } from "@/lib/schedule-page/build-schedule-page";
import { todayInLondon } from "@/lib/schedule";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const filters = parseScheduleFilters(query);
  const today = todayInLondon(new Date());
  const input = await getSchedulePageData();
  const farmOptions = input.farms.map(({ id, name }) => ({ id, name }));
  const selectedFarmId = farmOptions.some((farm) => farm.id === filters.farmId) ? filters.farmId : null;
  const effectiveFilters = { ...filters, farmId: selectedFarmId };
  const groups = buildSchedulePage(input, today, effectiveFilters);

  return (
    <MarkDoneProvider>
      <ScheduleScreen
        groups={groups}
        farmOptions={farmOptions}
        selectedFarmId={selectedFarmId}
        selectedStatus={filters.status}
        showCompleted={filters.showCompleted}
      />
    </MarkDoneProvider>
  );
}
