export interface CanonicalAmavasyaRecord {
  id:string; panjikaDayId:string; gregorianDate:string; tithiStart:string; tithiEnd:string; timezone:string;
  sourceIds:string[]; status?:string;
}
export interface AmavasyaObservance extends CanonicalAmavasyaRecord {}
export function deriveAmavasyaObservances(records:CanonicalAmavasyaRecord[],sourceIds:string[]=[]):AmavasyaObservance[]{
  return [...records]
    .filter((record)=>!record.status||record.status==="ACTIVE")
    .map((record)=>({...record,sourceIds:[...sourceIds,...record.sourceIds]}))
    .sort((a,b)=>a.gregorianDate.localeCompare(b.gregorianDate)||a.id.localeCompare(b.id));
}
