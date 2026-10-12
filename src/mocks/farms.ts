/** TEMPORARY placeholder farms. Replace with database records when Supabase is introduced. */
export type FarmStatus = "on-track" | "due-soon" | "overdue" | "done";

export const farms: { id: string; name: string; status: FarmStatus }[] = [
  { id: "obi-um", name: "Obi-Umuagbogho", status: "overdue" },
  { id: "uzor-timber", name: "Uzor Timber", status: "on-track" },
  { id: "iyanuole", name: "Iyanuole", status: "due-soon" },
  { id: "obaoba", name: "Obaoba", status: "on-track" },
];
