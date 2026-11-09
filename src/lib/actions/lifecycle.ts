"use server";

import { revalidatePath } from "next/cache";
import { authorNameFromUser } from "@/lib/auth/author-name";
import { diffSchedules, validateLifecycleDraft, type LifecycleDraft } from "@/lib/lifecycle/logic";
import { createClient } from "@/lib/supabase/server";
import { mapFarmInput, mapStageStates, mapTemplates, mapWindows } from "@/lib/data/map-rows";

const signedOut = "Your session has ended. Sign in again.";
export async function getLifecycleData() {
  try {
    const supabase=await createClient(); const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user)return {ok:false as const,message:signedOut};
    const [stages,windows]=await Promise.all([supabase.from("stage_templates").select("*").order("position"),supabase.from("season_windows").select("*")]);
    if(stages.error||windows.error)return {ok:false as const,message:"Could not load lifecycle settings. Try again."};
    return {ok:true as const,message:"",stages:stages.data??[],windows:windows.data??[]};
  } catch { return {ok:false as const,message:"Could not load lifecycle settings. Try again."}; }
}
export async function previewLifecycleImpact(draft: LifecycleDraft) {
  try {
    const supabase=await createClient(); const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user)return {ok:false as const,message:signedOut};
    const validation=validateLifecycleDraft(draft); if(!validation.ok)return {ok:false as const,message:"Fix the highlighted settings and try again.",errors:validation.errors};
    const [st,wi,fa,fs]=await Promise.all([supabase.from("stage_templates").select("*"),supabase.from("season_windows").select("*"),supabase.from("farms").select("*"),supabase.from("farm_stages").select("*")]);
    if(st.error||wi.error||fa.error||fs.error)return {ok:false as const,message:"Could not preview farm dates. Try again."};
    const templates=mapTemplates(st.data??[]), windows=mapWindows(wi.data??[]);
    const statesByFarm=new Map<string,typeof fs.data>(); for(const row of fs.data??[]){const rows=statesByFarm.get(row.farm_id)??[];rows.push(row);statesByFarm.set(row.farm_id,rows);}
    const farms=(fa.data??[]).map(f=>({id:f.id,name:f.name,farm:mapFarmInput(f),states:mapStageStates(statesByFarm.get(f.id)??[],st.data??[])}));
    const afterTemplates=draft.stages.map(s=>({position:s.position,name:s.name.trim(),triggerType:s.trigger_type,windowKey:s.window_key??undefined,offsetMonths:s.offset_months??undefined}));
    const afterWindows=draft.windows.map(w=>({key:w.key,startMonth:w.start_month,startDay:w.start_day,endMonth:w.end_month,endDay:w.end_day}));
    return {ok:true as const,message:"",impact:diffSchedules({templates,windows},{templates:afterTemplates,windows:afterWindows},farms)};
  } catch { return {ok:false as const,message:"Could not preview farm dates. Try again."}; }
}
export async function saveLifecycle(draft: LifecycleDraft) {
  try {
    const supabase=await createClient(); const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user)return {ok:false as const,message:signedOut};
    const validation=validateLifecycleDraft(draft); if(!validation.ok)return {ok:false as const,message:"Fix the highlighted settings and try again.",errors:validation.errors};
    const name=authorNameFromUser(auth.user);
    const {error}=await supabase.rpc("save_lifecycle",{p_stages:draft.stages.map(s=>({id:s.id,name:s.name.trim(),offset_months:s.offset_months})),p_windows:draft.windows,p_updated_by_name:name});
    if(error){const code=error.message.split(":")[0]; const {mapLifecycleError}=await import("@/lib/lifecycle/logic"); return {ok:false as const,message:mapLifecycleError(code)};}
    revalidatePath("/"); revalidatePath("/farms"); revalidatePath("/settings/lifecycle");
    const [{data:farms},{data:stamp}]=await Promise.all([supabase.from("farms").select("id"),supabase.from("stage_templates").select("updated_at").order("updated_at",{ascending:false}).limit(1).maybeSingle()]); for(const farm of farms??[])revalidatePath(`/farms/${farm.id}`);
    return {ok:true as const,message:"Lifecycle saved",updatedBy:name,updatedAt:stamp?.updated_at??""};
  } catch { return {ok:false as const,message:"Could not save lifecycle settings. Try again."}; }
}
