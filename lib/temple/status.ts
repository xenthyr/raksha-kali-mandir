import { CANONICAL } from "../config/canonical";
import type { EffectiveSchedule } from "./schedule";

export const TEMPLE_STATUS_STATES = ["OPEN","CLOSED","PUJA_RUNNING","AARTI_RUNNING","BHOG_RUNNING","SPECIAL_EVENT","EMERGENCY_CLOSED"] as const;
export type TempleStatusState = typeof TEMPLE_STATUS_STATES[number];
export type StatusSource = "CANONICAL_SCHEDULE"|"RUNTIME_ACTIVITY"|"SPECIAL_EVENT"|"MANUAL_TEMPORARY_STATUS"|"EMERGENCY_CLOSURE";

export interface LiveActivity {
  id: string; kind: "PUJA_RUNNING"|"AARTI_RUNNING"|"BHOG_RUNNING"|"SPECIAL_EVENT";
  startAt: string; endAt: string; source: string; sourceId?: string|null;
  labelBn?: string|null; labelEn?: string|null;
}
export interface ManualTemporaryStatus { state: TempleStatusState; startAt: string; endAt: string; sourceId?: string|null; reasonBn?: string|null; reasonEn?: string|null; }
export interface EmergencyClosure { id:string; startAt:string; endAt:string; sourceId?:string|null; reasonBn?:string|null; reasonEn?:string|null; }
export interface TempleStatusInput {
  templeId:string; currentTime:string; timezone:string; schedule:EffectiveSchedule;
  liveActivities?:LiveActivity[]; manualStatus?:ManualTemporaryStatus|null; emergencyClosure?:EmergencyClosure|null;
}
export interface TempleStatusResult {
  currentState:TempleStatusState; labelBn:string; labelEn:string; startedAt:string|null; endsAt:string|null;
  nextEvent:{id:string;labelBn:string;labelEn:string;startsAt:string;endsAt:string;source:StatusSource}|null;
  nextOpening:string|null; source:StatusSource; lastUpdated:string|null; staleAfter:string|null;
}
export class TempleStatusDomainError extends Error { readonly code="TEMPLE_STATUS_DOMAIN_ERROR"; constructor(message:string){super(message);this.name="TempleStatusDomainError";} }

const labels:Record<TempleStatusState,{bn:string;en:string}>={
 OPEN:{bn:"মন্দির খোলা",en:"Open"}, CLOSED:{bn:"মন্দির বন্ধ",en:"Closed"}, PUJA_RUNNING:{bn:"পূজা চলছে",en:"Puja running"},
 AARTI_RUNNING:{bn:"আরতি চলছে",en:"Aarti running"}, BHOG_RUNNING:{bn:"ভোগ চলছে",en:"Bhog running"}, SPECIAL_EVENT:{bn:"বিশেষ অনুষ্ঠান চলছে",en:"Special event running"},
 EMERGENCY_CLOSED:{bn:"জরুরি কারণে বন্ধ",en:"Emergency closed"},
};
function instant(value:string):number{const n=Date.parse(value);if(!Number.isFinite(n))throw new TempleStatusDomainError("Invalid time");return n;}
function active(now:number,start:string,end:string):boolean{return now>=instant(start)&&now<instant(end);}
function sourceFor(state:TempleStatusState):StatusSource{
 if(state==="EMERGENCY_CLOSED")return "EMERGENCY_CLOSURE";
 if(state==="SPECIAL_EVENT")return "SPECIAL_EVENT";
 if(state==="OPEN"||state==="CLOSED")return "CANONICAL_SCHEDULE";
 return "RUNTIME_ACTIVITY";
}

export function computeTempleStatus(input:TempleStatusInput):TempleStatusResult{
 if(input.templeId!==CANONICAL.templeId)throw new TempleStatusDomainError("Unknown temple");
 if(input.timezone!==CANONICAL.timezone||input.schedule.timezone!==CANONICAL.timezone)throw new TempleStatusDomainError("Timezone mismatch");
 const now=instant(input.currentTime);
 let state:TempleStatusState="CLOSED"; let startedAt:string|null=null; let endsAt:string|null=null; let override:{bn:string;en:string}|null=null;
 const emergency=input.emergencyClosure;
 if(emergency&&active(now,emergency.startAt,emergency.endAt)){
   state="EMERGENCY_CLOSED"; startedAt=emergency.startAt; endsAt=emergency.endAt; override={bn:emergency.reasonBn??labels.EMERGENCY_CLOSED.bn,en:emergency.reasonEn??labels.EMERGENCY_CLOSED.en};
 } else if(input.manualStatus&&active(now,input.manualStatus.startAt,input.manualStatus.endAt)){
   state=input.manualStatus.state; startedAt=input.manualStatus.startAt; endsAt=input.manualStatus.endAt;
   override={bn:input.manualStatus.reasonBn??labels[state].bn,en:input.manualStatus.reasonEn??labels[state].en};
 } else {
   const live=(input.liveActivities??[]).filter((a)=>active(now,a.startAt,a.endAt));
   if(live.length>1){
     const kinds=new Set(live.map((a)=>a.kind));
     if(kinds.size>1)throw new TempleStatusDomainError("Conflicting live activities");
   }
   const current=live[0];
   if(current){
     state=current.kind; startedAt=current.startAt; endsAt=current.endAt; override={bn:current.labelBn??labels[current.kind].bn,en:current.labelEn??labels[current.kind].en};
   } else {
     const window=input.schedule.windows.find((w)=>active(now,w.startAt,w.endAt));
     if(window){state="OPEN";startedAt=window.startAt;endsAt=window.endAt;override={bn:window.labelBn??labels.OPEN.bn,en:window.labelEn??labels.OPEN.en};}
   }
 }
 const future=(input.liveActivities??[]).filter((a)=>instant(a.startAt)>now).sort((a,b)=>instant(a.startAt)-instant(b.startAt)||a.id.localeCompare(b.id));
 if(future.length>1&&instant(future[0].startAt)===instant(future[1].startAt)&&future[0].kind!==future[1].kind)throw new TempleStatusDomainError("Conflicting next events");
 const futureEvent=future[0]??null;
 const nextEvent=futureEvent?{id:futureEvent.id,labelBn:futureEvent.labelBn??labels[futureEvent.kind].bn,labelEn:futureEvent.labelEn??labels[futureEvent.kind].en,startsAt:futureEvent.startAt,endsAt:futureEvent.endAt,source:futureEvent.kind==="SPECIAL_EVENT"?"SPECIAL_EVENT":"RUNTIME_ACTIVITY" as StatusSource}:null;
 return {currentState:state,labelBn:override?.bn??labels[state].bn,labelEn:override?.en??labels[state].en,startedAt,endsAt,nextEvent,nextOpening:input.schedule.nextOpening,source:sourceFor(state),lastUpdated:input.schedule.lastUpdated,staleAfter:input.schedule.staleAfter};
}
