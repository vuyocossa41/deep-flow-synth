type CaseStatus={status:string;resultReady:boolean};
// Sequential bounded polling: no overlapping fetches, no hidden-tab reads, no terminal/auth-denied retries.
export function pollCase(load:()=>Promise<CaseStatus>,onData:(value:CaseStatus)=>void,onError:(error:unknown)=>void,
 visible:()=>boolean=()=>document.visibilityState!=="hidden") {
 let active=true,stopped=false,delay=15000;
 let timer:ReturnType<typeof setTimeout>;
 const next=async()=>{
  if(!active || stopped) return;
  if(visible()) {
   try {
    const value=await load();if(!active)return;onData(value);
    stopped=value.resultReady || ["INSUFFICIENT_EVIDENCE","BENCHMARK_COMPLETE","COUNTEREXAMPLE"].includes(value.status);
   } catch(error) {
    if(!active)return;onError(error);
    stopped=[401,403,404].includes((error as {status?:number}).status || 0);
   }
  }
  if(active && !stopped){timer=setTimeout(next,delay);delay=Math.min(delay*2,120000);}
 };
 void next();return ()=>{active=false;clearTimeout(timer);};
}
