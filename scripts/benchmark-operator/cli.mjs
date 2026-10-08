import {build} from "esbuild";
import {readFileSync,fstatSync} from "node:fs";
import {createInterface} from "node:readline/promises";
import {remote,target} from "./remote.mjs";
import {consumeApproval,readPrivate,reservePrivate,savePrivate} from "./private.mjs";
async function main(){
 const [mode,configPath,requestPath,outPath,approvalPath]=process.argv.slice(2);
 if(!["approve","run"].includes(mode)||!configPath||!requestPath||!outPath)throw new Error("USAGE");
 const config=JSON.parse(await readPrivate(configPath)),request=JSON.parse(await readPrivate(requestPath)),scope=target(config);
 const bundle=await build({entryPoints:["scripts/benchmark-operator/core.ts"],bundle:true,platform:"node",format:"esm",write:false,logLevel:"silent"});
 const core=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
 if(mode==="approve"){
  if(!process.stdin.isTTY)throw new Error("OWNER_TTY_REQUIRED");const hash=await core.requestHash(request,scope);console.log(JSON.stringify({operation:request.operation,caseId:request.caseId||null,target:scope,requestHash:hash,policyVersion:"beta-30d-v1"}));
  const rl=createInterface({input:process.stdin,output:process.stdout});const text=await rl.question("Owner: type APPROVE "+hash+" to approve this exact operation: ");rl.close();if(text!=="APPROVE "+hash)throw new Error("APPROVAL_REFUSED");
  const now=new Date();await savePrivate(outPath,{requestHash:hash,target:scope,owner:"vuyocossa41@gmail.com",approvedAt:now.toISOString(),expiresAt:new Date(now.getTime()+15*60000).toISOString(),policyVersion:"beta-30d-v1"});console.log("APPROVAL_SAVED");return;
 }
 const st=fstatSync(3);if(!st.isFile()||st.uid!==process.getuid()||(st.mode&0o077))throw new Error("TOKEN_FD_PRIVATE_FILE_REQUIRED");const token=readFileSync(3,"utf8").trim();if(!token)throw new Error("AUTH_REQUIRED");
 const approval=approvalPath?JSON.parse(await readPrivate(approvalPath)):undefined;
 if(["issue","revoke","delete","reconcile"].includes(request.operation))await core.authorize(request,scope,approval,new Date());
 const client=remote(config,token);await client.authenticate();
 // Reserve before mutation, refuse overwrite, and never emit returned secrets or provider bodies.
 const output=await reservePrivate(outPath);
  if(["issue","revoke","delete","reconcile"].includes(request.operation))await consumeApproval(approvalPath);
 try{const result=await core.operate(client.env,request,scope,approval);await output.writeFile(JSON.stringify(result));await output.sync();console.log("OPERATION_COMPLETE; private result saved");}finally{await output.close();}
}
main().catch(()=>{console.error("OPERATOR_REFUSED_OR_FAILED; inspect approved targets and private state; do not blindly retry mutations");process.exitCode=1;});
