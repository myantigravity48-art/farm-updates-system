import { computeSchedule, type FarmInput, type StageState, type SeasonWindow, type StageTemplate } from "@/lib/schedule";

export type LifecycleStageDraft = { id: string; position: number; name: string; trigger_type: "season_window" | "after_planting"; offset_months: number | null; window_key: "dry_season" | "planting" | null };
export type LifecycleWindowDraft = { key: "dry_season" | "planting"; start_month: number; start_day: number; end_month: number; end_day: number };
export type LifecycleDraft = { stages: LifecycleStageDraft[]; windows: LifecycleWindowDraft[] };
export type LifecycleSaveState = "idle" | "previewing" | "confirming" | "saving" | "done" | "error";
export type LifecycleSaveEvent = "preview" | "preview_ok" | "preview_failed" | "save" | "save_ok" | "save_failed" | "reset";
export function lifecycleSaveTransition(state: LifecycleSaveState, event: LifecycleSaveEvent): LifecycleSaveState {
  if (event === "reset") return "idle";
  const transitions: Record<LifecycleSaveState, Partial<Record<LifecycleSaveEvent, LifecycleSaveState>>> = {
    idle: { preview: "previewing", preview_failed: "error" }, previewing: { preview_ok: "confirming", preview_failed: "error" },
    confirming: { save: "saving" }, saving: { save_ok: "done", save_failed: "error" }, done: { reset: "idle" }, error: { preview: "previewing", save: "saving" },
  };
  return transitions[state][event] ?? state;
}
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function daysInMonth(month: number): number { return [31,28,31,30,31,30,31,31,30,31,30,31][month - 1] ?? 0; }
export function monthDayLabel(month: number, day: number): string { return `${day} ${MONTHS[month - 1] ?? ""}`.trim(); }

export function validateLifecycleDraft(draft: LifecycleDraft) {
  const errors: Record<string, string> = {}; const warnings: string[] = [];
  const stages = Array.isArray(draft?.stages) ? draft.stages : [];
  const windows = Array.isArray(draft?.windows) ? draft.windows : [];
  if (stages.length !== 8 || new Set(stages.map(s => s.id)).size !== stages.length || stages.some(s => !s.id)) errors.stages = "Keep all eight stages in the list.";
  const names = stages.map(s => typeof s.name === "string" ? s.name.trim() : "");
  stages.forEach((s,i) => { if (!names[i] || names[i].length > 60) { const label=s.name.length>30?`${s.name.slice(0,30)}...`:s.name; errors[`name:${s.id}`]=`Stage ${s.position} (${label}): ${names[i].length} characters. Use 60 or fewer.`; } });
  if (new Set(names.map(n => n.toLocaleLowerCase("en-GB"))).size !== names.length) errors.duplicate_name = "Two stages have the same name. Names must be different.";
  for (const s of stages) if (s.trigger_type === "after_planting" ? !Number.isInteger(s.offset_months) || (s.offset_months as number) < 0 || (s.offset_months as number) > 60 : s.offset_months !== null) errors[`offset:${s.id}`] = "Use a whole number from 0 to 60 for after-planting stages.";
  if (windows.length !== 2 || new Set(windows.map(w => w.key)).size !== 2 || !["dry_season","planting"].every(k => windows.some(w => w.key === k))) errors.windows = "Include the dry season and planting windows.";
  for (const w of windows) if (![w.start_month,w.end_month].every(m => Number.isInteger(m) && m >= 1 && m <= 12) || !Number.isInteger(w.start_day) || w.start_day < 1 || w.start_day > daysInMonth(w.start_month) || !Number.isInteger(w.end_day) || w.end_day < 1 || w.end_day > daysInMonth(w.end_month)) errors[`window:${w.key}`] = `${w.key === "planting" ? "Planting window" : "Dry season window"}: that date doesn't exist.`;
  const valid = (w: LifecycleWindowDraft) => !errors[`window:${w.key}`];
  if (windows.length === 2 && windows.every(valid)) {
    const [a,b] = windows; const ordinal = (m:number,d:number) => Array.from({length:m-1},(_,i)=>daysInMonth(i+1)).reduce((sum,n)=>sum+n,0)+d;
    const span = (w:LifecycleWindowDraft) => { const s=ordinal(w.start_month,w.start_day), e=ordinal(w.end_month,w.end_day); return e>=s?e-s+1:365-s+e+1; };
    const ranges = windows.map(w => { const s=ordinal(w.start_month,w.start_day)-1, length=span(w); return Array.from({length},(_,i)=>(s+i)%365); });
    if (ranges[0].some(d => ranges[1].includes(d))) warnings.push("The dry season and planting windows overlap.");
    const longerThanNineMonths=(w:LifecycleWindowDraft)=>{const start=ordinal(w.start_month,w.start_day);const month=w.start_month-1+9;const targetMonth=month%12+1;const targetYearCarry=Math.floor(month/12);const targetDay=Math.min(w.start_day,daysInMonth(targetMonth));const target=ordinal(targetMonth,targetDay)+targetYearCarry*365;const end=ordinal(w.end_month,w.end_day)+(ordinal(w.end_month,w.end_day)<start?365:0);return end>target;};
    if (longerThanNineMonths(a) || longerThanNineMonths(b)) warnings.push("A season window is longer than 9 months.");
  }
  return { errors, warnings, ok: Object.keys(errors).length === 0 };
}
export function isDraftDirty(original: LifecycleDraft, draft: LifecycleDraft): boolean { return JSON.stringify(original) !== JSON.stringify(draft); }
export function mapLifecycleError(code: string): string { return ({duplicate_name:"Two stages have the same name. Names must be different.",bad_window:"That date doesn't exist. Use a day that is in the month (29 February isn't allowed).",bad_name:"Enter a stage name from 1 to 60 characters.",bad_offset:"Use a whole number from 0 to 60 for after-planting stages.",incomplete:"Some lifecycle settings are missing. Reload the page and try again.",unknown_stage:"A stage could not be found. Reload the page and try again."} as Record<string,string>)[code] ?? "Something went wrong. Try again."; }
export type ImpactFarm = { id:string; name:string; farm:FarmInput; states:StageState[] };
function dateText(value:string|null):string { if(!value)return "Unscheduled";const [year,month,day]=value.split("-").map(Number);return `${day} ${MONTHS[month-1]} ${year}`; }
export function diffSchedules(before:{templates:StageTemplate[];windows:SeasonWindow[]}, after:{templates:StageTemplate[];windows:SeasonWindow[]}, farms:ImpactFarm[]) {
  const examples:Array<{farm:string;stage:string;oldDate:string;newDate:string}> = []; const changedFarms = new Set<string>(); let changedStages = 0;
  for (const farm of farms) {
    const old = computeSchedule(before.templates,before.windows,farm.farm,farm.states); const next = computeSchedule(after.templates,after.windows,farm.farm,farm.states);
    for (const prior of old) { const state=farm.states.find(s=>s.position===prior.position); if(state?.isDone || state?.dueDateOverride) continue; const current=next.find(s=>s.position===prior.position); if(!current) continue;
      const oldDate=prior.dueDate??prior.windowStart??null, newDate=current.dueDate??current.windowStart??null;
      if(oldDate!==newDate){changedFarms.add(farm.id);changedStages+=1;if(examples.length<5)examples.push({farm:farm.name,stage:prior.name,oldDate:dateText(oldDate),newDate:dateText(newDate)});}
    }
  }
  return {farmsChanged:changedFarms.size,stagesChanged:changedStages,examples};
}
