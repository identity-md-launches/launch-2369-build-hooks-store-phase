// Start and stop a fresh local fork inside one bounded validation command.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import site from '../../public/site-config.json' with {type:'json'};
const web=fileURLToPath(new URL('../',import.meta.url)), rpc='http://127.0.0.1:8546';
const fork=spawn('anvil',['--fork-url',site.chains.find(c=>c.id===4663).rpcUrl,'--chain-id','4663','--port','8546','--no-storage-caching','--silent'],{stdio:['ignore','ignore','inherit']});
let spawnError;fork.on('error',e=>spawnError=e);
const run=(args,env={})=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:web,env:{...process.env,...env},stdio:'inherit'});child.on('error',reject);child.on('exit',(code,signal)=>code===0?resolve():reject(Error(`Check exited ${code??signal}`)));});
const stop=()=>fork.kill('SIGTERM');process.on('SIGINT',stop);process.on('SIGTERM',stop);
try{
 let ready=false;
 for(let i=0;i<100;i++){
  if(spawnError)throw spawnError;if(fork.exitCode!==null)throw Error('Anvil failed to start');
  try{const response=await fetch(rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'web3_clientVersion',params:[]}),signal:AbortSignal.timeout(1000)});ready=/anvil/i.test((await response.json()).result);if(ready)break;}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 if(!ready)throw Error('Local Anvil did not become ready');
 await run(['scripts/check-launch-fork.mjs'],{HOOKS_LAUNCH_FORK_URL:rpc});
 const all=process.argv.includes('--all'), live=process.argv.includes('--live');
 await run(['node_modules/@playwright/test/cli.js','test',...(all?[]:['tests/launch.spec.ts']),...(process.argv.includes('--webkit')?['--browser=webkit']:[])],{HOOKS_LAUNCH_FORK_URL:rpc,...(live?{HOOKS_LIVE_RPC:'1'}:{})});
}catch(e){console.error(e.message);process.exitCode=1;}finally{stop();}
