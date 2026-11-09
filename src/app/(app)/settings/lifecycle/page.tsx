import { redirect } from "next/navigation";
import { LifecycleScreen } from "@/components/settings/lifecycle-screen";
import { readSession } from "@/lib/auth/session";
import { todayInLondon } from "@/lib/schedule";
import { getLifecycleData } from "@/lib/actions/lifecycle";
import type { LifecycleStageDraft } from "@/lib/lifecycle/logic";

export default async function LifecyclePage(){
 const session=await readSession(); if(session.status==="signed-out")redirect("/login");
 const result=await getLifecycleData();
 if(!result.ok)return <main className="mx-auto w-full max-w-[720px]" role="alert">{result.message}</main>;
 const stages:LifecycleStageDraft[]=result.stages.map(s=>({...s,window_key:s.window_key==="dry_season"||s.window_key==="planting"?s.window_key:null}));
 return <LifecycleScreen stages={stages} windows={result.windows} today={todayInLondon(new Date())}/>;
}
