// Private administrative transport. No HTTP listener; no credential/body logging.
export const account="34a8750c552e11cbd96f3ffceba8b62a", database="ab704500-0ec3-466c-bff7-39492bfb6234", workflow="axon-correction-benchmark-beta";
export function target(config){if(config.account!==account || config.database!==database || config.workflow!==workflow || !/^[a-f0-9]{32}$/.test(config.kv) || /^0+$/.test(config.kv))throw new Error("TARGET_REFUSED");return [account,database,workflow,config.kv].join(":");}
export function remote(config,token,transport=fetch){
 target(config);const root="https://api.cloudflare.com/client/v4/accounts/"+account;
 async function call(path,method="GET",body,raw=false){
  let response;try{response=await transport(root+path,{method,headers:{Authorization:"Bearer "+token,...(body!==undefined?{"Content-Type":raw?"text/plain":"application/json"}:{})},body:body===undefined?undefined:raw?body:JSON.stringify(body),redirect:"error"});}catch{throw new Error("PROVIDER_UNAVAILABLE");}
  if(!response.ok){const error=new Error("PROVIDER_HTTP_"+response.status);error.status=response.status;throw error;}
  if(raw)return response.text();const data=await response.json();if(!data.success)throw new Error("PROVIDER_REFUSED");return data;
 }
 const queryPath="/d1/database/"+database+"/query";
 class Statement{
  constructor(sql,params=[]){this.sql=sql;this.params=params;}bind(...params){return new Statement(this.sql,params);}
  async run(){const result=(await call(queryPath,"POST",{sql:this.sql,params:this.params})).result;if(!result?.[0]?.success)throw new Error("D1_REFUSED");return result[0];}
  async first(){return (await this.run()).results?.[0] || null;}
  async all(){const value=await this.run();return {results:value.results || [],success:true,meta:value.meta};}
 }
 const db={prepare:sql=>new Statement(sql),batch:async statements=>{const data=await call(queryPath,"POST",{batch:statements.map(s=>({sql:s.sql,params:s.params}))});if(!Array.isArray(data.result)||data.result.length!==statements.length||!data.result.every(x=>x.success))throw new Error("D1_BATCH_REFUSED");return data.result;}};
 const base="/storage/kv/namespaces/"+config.kv;
 const kv={get:async(key,type)=>{try{const text=await call(base+"/values/"+encodeURIComponent(key),"GET",undefined,true);return type==="json"?JSON.parse(text):text;}catch(e){if(e.status===404)return null;throw e;}},put:async(key,value)=>call(base+"/values/"+encodeURIComponent(key),"PUT",value,true),list:async({prefix,cursor}={})=>{const data=await call(base+"/keys?"+new URLSearchParams({prefix:prefix||"",...(cursor?{cursor}:{})}));return {keys:data.result,list_complete:!data.result_info?.cursor,cursor:data.result_info?.cursor};}};
 async function instances(){const rows=[];for(let page=1;page<=100;page++){const data=await call("/workflows/"+workflow+"/instances?"+new URLSearchParams({page:String(page),per_page:"100"}));if(!Array.isArray(data.result))throw new Error("INSTANCE_LIST_REFUSED");if(data.result.some(x=>rows.some(r=>r.id===x.id)))throw new Error("INSTANCE_LIST_INCOMPLETE");rows.push(...data.result);if(data.result_info?.total_pages!==undefined){if(page>=data.result_info.total_pages)return rows;}else if(data.result.length<100)return rows;}throw new Error("INSTANCE_LIST_INCOMPLETE");}
 const wf={get:async id=>{if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error("INSTANCE_SCOPE_REFUSED");const row=(await instances()).find(x=>x.id===id);if(!row)throw new Error("instance.not_found");return {id,status:async()=>({status:row.status}),delete:async()=>{const data=await call("/workflows/"+workflow+"/instances/batch/delete","POST",{instances:[id]});if(data.result?.errors?.length!==0 || data.result?.deleted?.length!==1 || data.result.deleted[0]?.id!==id)throw new Error("WORKFLOW_DELETE_REFUSED");}};}};
 async function authenticate(){
  // Identity is checked using the user-bound grant; service tokens without user identity fail closed.
  const response=await transport("https://api.cloudflare.com/client/v4/user",{headers:{Authorization:"Bearer "+token},redirect:"error"});if(!response.ok)throw new Error("OWNER_AUTH_REQUIRED");const user=await response.json();if(!user.success || user.result?.email!=="vuyocossa41@gmail.com" || user.result?.two_factor_authentication_enabled!==true)throw new Error("OWNER_MFA_REQUIRED");
  const settings=(await call("/workers/scripts/"+workflow+"/settings")).result;const bindings=settings.bindings || [];
  if(!bindings.some(b=>b.name==="BENCHMARK_DB"&&b.id===database) || !bindings.some(b=>b.name==="BENCHMARK_CONTROL"&&b.namespace_id===config.kv) || !bindings.some(b=>b.name==="BENCHMARK"&&b.workflow_name===workflow))throw new Error("LIVE_BINDINGS_REFUSED");
  await call(base);await call("/d1/database/"+database);await call("/workflows/"+workflow);
 }
 return {env:{BENCHMARK_DB:db,BENCHMARK_CONTROL:kv,BENCHMARK:wf},authenticate,instances};
}
