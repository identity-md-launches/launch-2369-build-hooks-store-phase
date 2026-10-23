import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { encodeAbiParameters, parseAbiParameters, toHex, stringToHex, keccak256 } from 'viem';
import site from '../../public/site-config.json' with { type: 'json' };
import pond from '../../tests/fixtures/job14/pond-logs.json' with { type: 'json' };
import snapshot from '../../tests/fixtures/job14/launch-records.json' with { type: 'json' };
import proven from '../../tests/fixtures/job14/proven-launches.json' with { type: 'json' };
import job2 from '../../tests/fixtures/job14/launch-2-job-blocked.json' with { type: 'json' };
import job3 from '../../tests/fixtures/job14/launch-3-job-blocked.json' with { type: 'json' };
import job4 from '../../tests/fixtures/job14/launch-4-job-blocked.json' with { type: 'json' };
import { newDraft, addBlock } from '../../src/lib/compose';
import { launchFromRequested, parseBody, decodeIntake } from '../src/chain/decode';
import { matchingLaunchRecord, parseLaunchRecords, LAUNCH_RECORDS_URL } from '../src/chain/records';
import { PROVEN_LAUNCHES_URL } from '../../src/lib/proven';
import { REQUEST_TOPIC, COMPLETE_TOPIC } from '../src/chain/store';
import { injectedOwner, rpcRoute } from './chain-fixture';
const output = new URL('../../artifacts/job14/', import.meta.url);
const records = parseLaunchRecords(snapshot), payer = snapshot.launches[0].paidBy;
const rows = pond.requests.map(r => ({ ...r, launch: launchFromRequested(r.log as any, 1, site.intake.launchAction, r.timestamp)! }));
const stopped = rows.filter(r => [2,3,4].includes(r.testLaunch));
const allJobs: Record<string, any> = Object.fromEntries([job2,job3,job4].map(j=>[j.id,j]));
const head = Number(BigInt(pond.head)) + 20;
type Options = { outage?: 'intake' | 'jobs' | 'launches' | 'all'; checking?: boolean; young?: boolean };
async function fixture(page: Page, options: Options = {}) {
  let blocked = false, releaseCode: (() => void) | undefined;
  const codeGate = new Promise<void>(resolve => { releaseCode = resolve; });
  const calls: { chain: number; method: string; params: any[] }[] = [];
  const config = { ...site, ads: {}, chains: site.chains.map(c => ({ ...c, intakeFromBlock: c.id === 1 ? Math.min(...rows.map(r=>Number(BigInt(r.log.blockNumber)))) : head - 20 })) };
  const youngRequest = (() => {
    const base = rows.find(r=>r.testLaunch===4)!, body = parseBody((decodeIntake(base.log as any).args as any).body)!;
    const objective = String(body.objective).replaceAll('WordsmithHook','FreshReed');
    const id = keccak256(stringToHex('job14 synthetic young request: '+objective));
    return { ...base.log, blockNumber: toHex(head-1), transactionHash: keccak256(stringToHex('job14 synthetic young transaction')), topics: [REQUEST_TOPIC,id,...base.log.topics.slice(2)], data: encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'),[stringToHex(JSON.stringify({...body,objective})),payer as any,'0x00000000',config.chains.find(c=>c.id===1)!.imdAddress as any,500000000000000000n]) };
  })();
  const requests = [...rows.map(r=>r.log), ...(options.young?[youngRequest]:[])];
  const attentionJobs: Record<string, string> = Object.fromEntries(stopped.map(r=>[r.launch.requestId, [job2,job3,job4].find(j=>String(j.blockedReason).includes(r.testLaunch===2?'IMD/native-ETH':r.launch.name))!.id]));
  for (const r of rows.filter(r=>!stopped.includes(r))) { const record=matchingLaunchRecord(r.launch,records)!; attentionJobs[r.launch.requestId]=record.jobId!; }
  const relay = `${site.relayUrl}/`;
  await page.route('**/site-config.json',r=>r.fulfill({json:config}));
  await page.route('https://api.imd.fun/swarm',r=>r.fulfill({status:503}));
  await page.route('https://raw.githubusercontent.com/**',r=>r.abort());
  await page.route(LAUNCH_RECORDS_URL,r=>r.fulfill({json:snapshot}));
  await page.route(PROVEN_LAUNCHES_URL,r=>r.fulfill({json:proven}));
  await page.route('https://ipfs.imd.fun/**',r=>r.fulfill({status:503}));
  await page.route(`${relay}**`,async r=>{
    const path=new URL(r.request().url()).pathname;
    const type=path.split('/')[1];
    if(options.outage==='all'||options.outage===type) return r.fulfill({status:503,json:{detail:'Fixture: record plane busy'}});
    if(type==='intake') {
      const tx=path.split('/').at(-1)!.toLowerCase(),log=requests.find(l=>l.transactionHash.toLowerCase()===tx);
      const requestId=log?.topics[1],jobId=requestId===youngRequest.topics[1]?'job14-young-fixture':attentionJobs[requestId??''];
      return r.fulfill({json:{entries:jobId?[{requestId,action:'launch.open',admission:{result:{jobId}}}]:[]}});
    }
    if(type==='jobs') {
      const id=path.split('/').at(-1)!;
      if(id==='job14-young-fixture')return r.fulfill({json:{id,state:blocked?'blocked':'executing',blockedReason:blocked?'needs_input: Fixture asks for a clarification':null,nodes:[]}});
      if(allJobs[id])return r.fulfill({json:allJobs[id]});
      const record=records.find(r=>r.jobId===id);
      return r.fulfill({json:{id,state:'completed',nodes:[],launch:{id:record?.launchId,status:'live'}}});
    }
    if(type==='launches') {
      const id=path.split('/').at(-1),record=records.find(r=>r.launchId===id);
      return r.fulfill({json:record?{...record,id:record.launchId,jobs:[{id:record.jobId}],seeded:{pools:record.pool?[record.pool]:[]}}:{launches:[]}});
    }
    return r.fulfill({json:{}});
  });
  for(const chain of config.chains)await page.route(rpcRoute(chain),async route=>{
    const req=route.request().postDataJSON();
    const respond=async (q:any)=>{
      calls.push({chain:chain.id,...q});let result:unknown;
      if(q.method==='eth_chainId')result=toHex(chain.id);
      else if(q.method==='eth_blockNumber')result=toHex(head);
      else if(q.method==='eth_getLogs') {
        const f=q.params[0],source=chain.id===1?(f.topics[0]===REQUEST_TOPIC?requests:f.topics[0]===COMPLETE_TOPIC?pond.completions:[]):[];
        result=source.filter(l=>BigInt(l.blockNumber)>=BigInt(f.fromBlock)&&BigInt(l.blockNumber)<=BigInt(f.toBlock)&&f.topics.every((t:any,i:number)=>t==null||(Array.isArray(t)?t.some(v=>v.toLowerCase()===l.topics[i]?.toLowerCase()):t.toLowerCase()===l.topics[i]?.toLowerCase())));
      } else if(q.method==='eth_getBlockByNumber') {
        const row=rows.find(r=>BigInt(r.log.blockNumber)===BigInt(q.params[0]));
        const log=[...requests,...pond.completions].find(l=>BigInt(l.blockNumber)===BigInt(q.params[0]));
        result={number:q.params[0],hash:log?.blockHash??rows[0].log.blockHash,timestamp:toHex(BigInt(q.params[0])===BigInt(youngRequest.blockNumber)?Math.floor(Date.now()/1000):row?.timestamp??1792620000),transactions:[]};
      } else if(q.method==='eth_getCode') {
        if(options.checking&&q.params[0].toLowerCase()===records.find(r=>r.launchNumber===2448)!.artifacts.find(a=>a.role==='hook')!.address.toLowerCase())await codeGate;
        result='0x600060005260206000f3';
      } else if(q.method==='eth_call') {
        const {to,data}=q.params[0];
        const record=records.find(r=>r.artifacts.some(a=>a.address.toLowerCase()===to.toLowerCase()));
        const entry=(proven as any).launches?.find((p:any)=>p.launchId===record?.launchId);
        if(data.startsWith('0x7f5a7c7b')&&entry?.hookAddress)result=encodeAbiParameters(parseAbiParameters('address'),[entry.hookAddress]);
        else return {jsonrpc:'2.0',id:q.id,error:{code:3,message:'Fixture: unavailable reading'}};
      } else return {jsonrpc:'2.0',id:q.id,error:{code:-32601,message:'Fixture: unsupported method'}};
      return {jsonrpc:'2.0',id:q.id,result};
    };
    const reply=Array.isArray(req)?await Promise.all(req.map(respond)):await respond(req);
    await route.fulfill({json:reply});
  });
  return { calls, block:()=>{blocked=true;}, releaseCode:()=>releaseCode!(), youngId:youngRequest.topics[1] };
}
const view = (request:string)=>`#hook/1/${request}`;
test('pond counts four hooks, excludes stopped names and preserves all four LIVE and PROVEN cards',async({page})=>{
  await fixture(page);await page.goto('#catalog');
  await expect(page.locator('.result-count')).toHaveText('4 hooks');
  await expect(page.locator('.grid .status-live')).toHaveCount(4);await expect(page.locator('.grid .proven')).toHaveCount(4);
  for(const row of stopped){expect(await page.locator(`.grid [data-launch-id="${row.launch.id}"]`).count()).toBe(0);await page.locator('#q').fill(row.launch.name==='test'?'test':row.launch.name);await page.locator('#q').press('Enter');await expect(page.locator(`.grid [data-launch-id="${row.launch.id}"]`)).toHaveCount(0);await expect(page.locator('.result-count')).toHaveText(row.launch.name==='test'?'1 hook':'0 hooks');}
  await page.locator('#q').fill('');await page.getByLabel('Live only',{exact:true}).check();await expect(page.locator('.result-count')).toHaveText('4 hooks');
  await page.getByLabel('In progress',{exact:true}).check();await expect(page.locator('.result-count')).toHaveText('0 hooks');await page.getByLabel('All',{exact:true}).check();await expect(page.locator('.result-count')).toHaveText('4 hooks');
});
test('paying wallet retains all three stopped requests, explanations and Fix in Builder',async({page})=>{
  await page.setViewportSize({width:390,height:844});await fixture(page);await injectedOwner(page,payer);await page.goto('#mine');await page.locator('#connect').click();await page.getByRole('button',{name:'Fork Wallet',exact:true}).click();
  await expect(page.locator('.mine-row')).toHaveCount(7);
  await expect(page.locator('.mine-attention')).toHaveCount(3);
  for(const row of stopped){const card=page.locator('.mine-row').filter({has:page.getByRole('heading',{name:row.launch.name,exact:true})});const matching=row.launch.name==='test'?card.filter({has:page.locator('.mine-attention')}):card;await expect(matching).toContainText('Needs attention');await expect(matching.locator('.status-requested')).toHaveCount(1);await expect(matching.getByRole('button',{name:'Fix in Builder',exact:true})).toBeVisible();}
  fs.mkdirSync(output,{recursive:true});await page.locator('.mine-row').filter({has:page.getByRole('heading',{name:'WordsmithHook',exact:true})}).screenshot({path:new URL('mine-390.jpg',output).pathname,type:'jpeg',quality:65});
  await page.locator('.mine-row').filter({has:page.getByRole('heading',{name:'WordsmithHook',exact:true})}).getByRole('button',{name:'Fix in Builder'}).click();await expect(page).toHaveURL(/#builder/);await expect(page.locator('.builder-page')).toContainText('needs_input');
});
for(const row of stopped)test(`direct link keeps stopped ${row.launch.name} with pond notice`,async({page})=>{
  await fixture(page);await page.goto(view(row.launch.requestId));await expect(page.locator('#hook-h')).toHaveText(row.launch.name);await expect(page.locator('.pond-notice')).toHaveText('Not on the pond: IMD stopped this launch');await expect(page.locator('.needs-attention')).toContainText('Needs attention');await expect(page.getByText('Request text as sent', {exact:true})).toBeVisible();
});
test('a young request leaves the next refreshed grid as soon as its real-plane job is blocked',async({page})=>{
  const f=await fixture(page,{young:true});await page.goto('#catalog');await expect(page.locator('.result-count')).toHaveText('5 hooks');await expect(page.getByRole('heading',{name:'FreshReed',exact:true})).toBeVisible();
  f.block();await page.reload();await expect(page.locator('.result-count')).toHaveText('4 hooks');await expect(page.getByRole('heading',{name:'FreshReed',exact:true})).toHaveCount(0);
  await page.goto(view(f.youngId));await expect(page.locator('.pond-notice')).toHaveText('Not on the pond: IMD stopped this launch');
});
for(const outage of ['all','intake','jobs','launches'] as const)test(`snapshot keeps four live hooks when ${outage} record reads return 503`,async({page})=>{
  await fixture(page,{outage});await page.goto('#catalog');await expect(page.locator('.grid .status-live')).toHaveCount(4);await expect(page.locator('.result-count')).toHaveText('4 hooks');await expect(page.locator('.grid .proven')).toHaveCount(4);
});
test('live type A reads Checking, appears in In progress, then becomes LIVE when code answers',async({page})=>{
  const f=await fixture(page,{outage:'all',checking:true});await page.goto('#catalog');const card=page.locator('.grid .card').filter({has:page.getByRole('heading',{name:'test',exact:false})});
  await expect(page.locator('.grid .status-checking')).toHaveText('Checking…');await expect(card.locator('.status-in-progress')).toHaveCount(0);await expect(page.locator('.result-count')).toHaveText('4 hooks');
  await page.getByLabel('In progress',{exact:true}).check();await expect(page.locator('.result-count')).toHaveText('1 hook');await expect(page.locator('.grid .status-checking')).toBeVisible();
  f.releaseCode();await expect(page.locator('.result-count')).toHaveText('0 hooks');await page.getByLabel('Live only',{exact:true}).check();await expect(page.locator('.grid .status-live')).toHaveCount(4);
});
test('named hook-only draft without chain or wallet lists exactly two causes and links to owner',async({page})=>{
  await fixture(page);let d={...newDraft(),type:'B' as const,mode:'blocks' as const,seeded:true};d.settings.hname='WordsmithHook';d=addBlock(d,'pause') as typeof d;
  await page.addInitScript(d=>localStorage.setItem('hooks-store:draft:v2',JSON.stringify(d)),d);await page.goto('#builder');await expect(page.locator('.findings .finding')).toHaveCount(2);await expect(page.locator('.findings')).toContainText('fee recipient, body owner and deployer constructor');
  await page.locator('.findings .finding').filter({hasText:'fee recipient, body owner'}).getByRole('button').click();await expect(page.locator('#s-owner')).toBeFocused();
});
for(const width of [320,390,820,1440])test(`production routes fit at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await fixture(page,{outage:'all'});await page.goto('#store');await expect(page.locator('.grid .status-live')).toHaveCount(4);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  if(width===390){await expect(page.getByRole('button',{name:'Describe it',exact:true})).toBeInViewport();await page.screenshot({path:new URL('store-390.jpg',output).pathname,type:'jpeg',quality:60});}
  await page.goto(view(stopped[0].launch.requestId));await expect(page.locator('.pond-notice')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
