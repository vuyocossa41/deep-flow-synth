import {constants} from "node:fs";
import {lstat,open,realpath} from "node:fs/promises";
import {dirname,resolve,relative} from "node:path";
export async function safePath(path){const full=resolve(path),parent=await realpath(dirname(full)),repo=await realpath(process.cwd());const inside=relative(repo,parent);if(!inside.startsWith("..")&&!inside.startsWith("/"))throw new Error("PRIVATE_PATH_OUTSIDE_REPO_REQUIRED");const st=await lstat(parent);if(!st.isDirectory()||st.uid!==process.getuid()||(st.mode&0o077))throw new Error("PRIVATE_DIRECTORY_0700_REQUIRED");return full;}
export async function readPrivate(path){await safePath(path);const h=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{const st=await h.stat();const link=await lstat(path);if(!st.isFile()||link.isSymbolicLink()||st.uid!==process.getuid()||(st.mode&0o077))throw new Error("PRIVATE_FILE_0600_REQUIRED");return await h.readFile("utf8");}finally{await h.close();}}
export async function reservePrivate(path){await safePath(path);return open(path,"wx",0o600);}
export async function savePrivate(path,value){const h=await reservePrivate(path);try{await h.writeFile(JSON.stringify(value));await h.sync();}finally{await h.close();}}

export async function consumeApproval(path){const h=await reservePrivate(path+".used");try{await h.writeFile("CONSUMED\n");await h.sync();}finally{await h.close();}}
