import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encodeAbiParameters, encodeEventTopics, stringToHex, parseAbiParameters } from '../web/node_modules/viem/_esm/index.js';
import * as D from '../web/src/chain/decode.ts';
import { backwardsRanges, LaunchStore, cacheKey, REQUEST_TOPIC, COMPLETE_TOPIC } from '../web/src/chain/store.ts';
import { creatorName } from '../web/src/chain/ens.ts';
import { functionAbi, argumentValues, managementFunctions, formatReading } from '../web/src/chain/manage.ts';
import { searchAddress } from '../web/src/chain/resolve.ts';
import * as C from '../src/lib/compose.ts';
import config from '../public/site-config.json' with { type: 'json' };
const fixtures = [1,4663].map(chain => JSON.parse(fs.readFileSync(new URL(`fixtures/chain/${chain}-intake.json`, import.meta.url),'utf8')));
const base = fixtures[0].logs.find(l=>D.decodeIntake(l).eventName==='Requested');
const realRequest = D.decodeIntake(base).args;
const body = (type='B', ids=['pause','cooldown']) => {let d={...C.newDraft(),type,settings:{...C.emptySettings(),chain:4663,hname:'PondGuard',pool:50}};for(const id of ids)d=C.addBlock(d,id);return C.body(d);};
// Only this helper creates a synthetic store request. Captured files remain unmodified.
const requested = (b=body(), requestId=realRequest.requestId, action=config.intake.launchAction) => ({...base,
 topics:encodeEventTopics({abi:D.intakeAbi,eventName:'Requested',args:{requestId,payer:realRequest.payer,action}}),
 data:encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'),[stringToHex(JSON.stringify(b)),realRequest.callbackTarget,realRequest.callbackSelector,realRequest.asset,realRequest.amount]),
});
const completed = (status=0, reason='') => ({...base,topics:encodeEventTopics({abi:D.intakeAbi,eventName:'Completed',args:{requestId:realRequest.requestId}}),
 data:encodeAbiParameters(parseAbiParameters('uint8,bytes32,string,bool'),[status,stringToHex(reason,{size:32}),'ipfs://bafybeiehm6g5f64gnapfl2elqikvaxb2paxsljvhrow43dxoidn6macbpm/result.json',false])});
const launch = () => D.launchFromRequested(requested(),1,config.intake.launchAction,1792563203);

test('decodes at least two real Requested and two Completed logs from each chain',()=>{
 for(const fixture of fixtures){const events=fixture.logs.map(D.decodeIntake);assert.ok(events.filter(e=>e.eventName==='Requested').length>=2);assert.ok(events.filter(e=>e.eventName==='Completed').length>=2);
 for(const e of events) if(e.eventName==='Requested'){assert.equal(e.args.action,config.intake.launchAction);assert.equal(typeof D.parseBody(e.args.body)?.objective,'string');}
 for(const log of fixture.logs) assert.equal(D.launchFromRequested(log,fixture.chainId,config.intake.launchAction),null,'Other IMD launches never become store cards');
 }
});
test('requires launch action, accepted kind and an exact terminal marker; handles both composer endings',()=>{
 assert.ok(launch()); assert.ok(D.launchFromRequested(requested(body('B',[])),1,config.intake.launchAction));
 const b=body();for(const invalid of [{...b,onchain:'custom_token'},{...b,objective:b.objective+' More text.'},{...b,objective:'Composed with the hooks store.'},{...b,chainId:10}])assert.equal(D.launchFromRequested(requested(invalid),1,config.intake.launchAction),null);
 assert.equal(D.launchFromRequested(requested(b,realRequest.requestId,stringToHex('other',{size:32})),1,config.intake.launchAction),null);
 assert.equal(D.launchFromRequested({...requested(),data:'0x00'},1,config.intake.launchAction),null);
 assert.equal(D.parseBody('0x6e6f742d6a736f6e'),null);
});
test('every numbered rule template matches its own rendered sentence; label parameters and repeated values survive',()=>{
 for(const def of C.BLOCKS.filter(b=>!C.TOKEN_IDS.includes(b.id)&&b.id!=='custom')){const block=C.entry(def.id),draft=C.addBlock(C.newDraft(),'swap-fee');draft.settings.pair='eth';const ctx=C.context(draft,'0x6cba4751742f6989fa224b2dc5d5d52fcef98a34');const rendered=C.sentenceOf(block,ctx);const match=D.matchRule(rendered,ctx);assert.equal(match?.id,def.id,rendered);assert.equal(C.shortOf(match,ctx),C.shortOf(block,ctx));}
 const row=launch();assert.deepEqual(row.blocks,['owner can pause','30s between swaps per wallet']);assert.deepEqual(row.matchedBlocks.map(b=>b.id),['pause','cooldown']);
 const altered=D.parseObjective(body().objective.replace('1. The owner','1. Extra wording. The owner'));assert.ok(altered.blocks.includes('Custom'));assert.equal(altered.matchedBlocks.some(b=>b.id==='pause'),false);
});
test('old fee templates remain readable and current IMD fees decode into the same management blocks',()=>{
 const payer='0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
 for(const pair of ['imd','eth'])for(const def of C.BLOCKS.filter(b=>b.legacySentences?.length)){
  let d=C.newDraft();d.settings={...d.settings,chain:1,pair,pool:50};
  if(def.requires)d=C.addBlock(d,def.requires);if(def.requiresAny)d=C.addBlock(d,def.requiresAny[0]);d=C.addBlock(d,def.id);
  const block=d.blocks.find(b=>b.id===def.id),ctx=C.context(d,payer);
  if(def.id==='fee-split')block.p.b=C.IMD_TREASURY;
  assert.equal(D.matchRule(C.sentenceOf(block,ctx),ctx)?.id,def.id);
  assert.equal(D.matchRule(C.fill(def.legacySentences[0],def,block.p,ctx),ctx)?.id,def.id);
  if(def.params.some(p=>p.options?.includes("IMD's treasury"))){
   const p=def.params.find(p=>p.options?.includes("IMD's treasury"));block.p[p.k]="IMD's treasury";
   assert.equal(D.matchRule(C.sentenceOf(block,ctx),ctx)?.id,def.id);
  }
 }
 assert.equal(formatReading('jar',10n**18n,'IMD'),'1 IMD');
 assert.equal(formatReading('pot',10n**18n,'IMD'),'1 IMD');
});
test('fee recipients recovered from a request retain a literal address unless it was the paying wallet',()=>{
 const payer='0x6cba4751742f6989fa224b2dc5d5d52fcef98a34', recipient='0x9a50fd22bcefd3774d796e775a467a7f743e0ab0';
 let d=C.addBlock(C.newDraft(),'swap-fee');d.settings={...d.settings,chain:1,pool:50};
 assert.equal(D.parseObjective(C.compose(d,payer),payer).matchedBlocks[0].p.to,'my wallet');
 d.blocks[1].p.to=recipient;
 assert.equal(D.parseObjective(C.compose(d,payer),payer).matchedBlocks[0].p.to,recipient);
});
test('request location is the payment chain; contract location comes from body.chainId',()=>{const row=launch();assert.equal(row.intakeChainId,1);assert.equal(row.chainId,4663);assert.match(row.id,/^1:/);assert.equal(row.name,'PondGuard');assert.match(D.pondMessage(row),/^PondGuard was requested on Robinhood Chain$/);});
test('completion status 1 or 2 is Failed, with ASCII reason; real empty reason is explicit',()=>{
 for(const status of [1,2]){const row=D.applyCompleted(launch(),completed(status,'BUILD_REFUSED'));assert.equal(row.status,'failed');assert.equal(row.completion.reason,'BUILD_REFUSED');}
 const real=fixtures[1].logs.find(l=>D.decodeIntake(l).eventName==='Completed'&&D.decodeIntake(l).args.status>0);const args=D.decodeIntake(real).args;
 const row=D.applyCompleted({...launch(),requestId:args.requestId},real);assert.equal(row.status,'failed');assert.equal(row.completion.reason,'No reason supplied by Intake');
});
test('real result JSON for a completed build without addresses never fabricates Live',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('fixtures/chain/completed-build-result.json',import.meta.url),'utf8'));
 const row=D.applyResult(D.applyCompleted(launch(),completed()),fixture.result);assert.equal(row.status,'in-progress');assert.equal(row.hookAddress,null);assert.equal(row.launchNumber,null);assert.ok(row.resultLoaded);assert.equal(row.jobIds[0],fixture.result.jobId);
 assert.equal(D.resultUrl('ipfs://bafybeiehm6g5f64gnapfl2elqikvaxb2paxsljvhrow43dxoidn6macbpm/result.json',config.intake.ipfsGateway),fixture.source.url);
 for(const bad of ['https://evil.example/result.json','ipfs://../../bad','ipfs://CID/other.json'])assert.equal(D.resultUrl(bad,config.intake.ipfsGateway),null);
 assert.equal(D.safeUrl('javascript:alert(1)'),null);
});
test('Type A Live result mapping and 40/64-hex searches use exact launch addresses and hashes',()=>{
 // Schema fixture uses only real observed addresses; it is deliberately not represented as a captured result.json.
 const hook='0x82f636a92364d13754d7b3e72d460f0be20a28cc', token='0x8e7c7936b4f2d4475dc4bacd174dc228d4d24e86', dist='0x559ca7521402ea519363e0a5b2b7dd97c3f9f48f', currency='0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7';
 // Existing job7 requests identify a hook directly; job8 Deployer requests must
 // instead resolve hook() (covered in job8-ui.test.mjs).
 const direct={...launch(),type:'A',request:launch().request.replace(/^Deploy one contract, [^\n]+/, 'Deploy one contract: PondGuard, a standalone Uniswap v4 hook on Robinhood Chain.')};
 const row=D.applyResult(direct,{launch:{launchNumber:2336,hookAddress:hook,tokenAddress:token,distributorAddress:dist,poolKey:{currency0:token,currency1:currency}}});
 assert.equal(row.status,'live');assert.equal(row.launchNumber,2336);
 for(const q of [hook,token,dist,currency,row.requestId,row.txHashes[0],token.slice(2)])assert.equal(D.matchesQuery(row,q),true,q);
 assert.equal(D.matchesQuery(row,'GUARD pause'),true);assert.equal(D.matchesQuery(row,'missing pause'),false);
 assert.equal(searchAddress(token.slice(2))?.toLowerCase(),token);assert.equal(searchAddress('0x1234'),null);
});
test('owner/public/view minimal ABI deduplicates functions, validates each argument and formats readings',()=>{
 const all=managementFunctions(C.BLOCKS.filter(b=>!C.TOKEN_IDS.includes(b.id)).map(b=>C.entry(b.id)));
 assert.equal(all.filter(f=>f.sig==='claimFees(PoolId poolId)').length,1);
 const args=functionAbi('setAllowed(address[] accounts, bool allowed)',false), addr=realRequest.payer;
 assert.deepEqual(argumentValues(args,[`${addr}, ${addr}`,'false']),[[addr,addr],false]);
 assert.throws(()=>argumentValues(args,['bad','true']),/address/);assert.throws(()=>argumentValues(args,[addr,'']),/choose true or false/);
 const order=functionAbi('placeOrder(bool zeroForOne, int24 tick, uint256 amount)',false);
 assert.deepEqual(argumentValues(order,['true','-2','1000000000000000000']),[true,-2,1000000000000000000n]);
 assert.throws(()=>argumentValues(order,['true','8388608','1']),/int24/);assert.throws(()=>argumentValues(order,['true','1','-1']),/uint256/);
 assert.equal(formatReading('jar',10n**18n),'1 ETH');assert.equal(formatReading('paused',false),'No');
});
test('inclusive backwards ranges are gap-free, non-overlapping and never exceed 10,000 blocks',()=>{
 const ranges=[...backwardsRanges(17n,25312n)];assert.deepEqual(ranges,[[15313n,25312n],[5313n,15312n],[17n,5312n]]);assert.deepEqual([...backwardsRanges(1n,0n)],[]);
});
test('ENS reverse results cache by lowercase payer for a day, including negative lookups',async()=>{
 const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 let calls=0;const client={getEnsName:async()=>{calls++;return 'fixture.eth';}};
 assert.equal(await creatorName(client,realRequest.payer,1000),'fixture.eth');assert.equal(await creatorName(client,realRequest.payer.toLowerCase(),2000),'fixture.eth');assert.equal(calls,1);
 await creatorName(client,realRequest.payer,86402000);assert.equal(calls,2);delete globalThis.localStorage;
});
test('cache construction re-filters unrelated launches; storage corruption stays usable',()=>{
 const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 const row=requested();storage.set(cacheKey(1),JSON.stringify({version:2,head:'100',cursor:'50',records:{[realRequest.requestId]:{requested:row},outside:{requested:base}}}));
 const store=new LaunchStore(config,{});assert.equal(store.getSnapshot().launches.length,1);assert.equal(store.getSnapshot().launches[0].name,'PondGuard');
 storage.set(cacheKey(1),'bad json');assert.equal(new LaunchStore(config,{}).getSnapshot().launches.length,0);delete globalThis.localStorage;
});

test('head polling casts only newly observed store launches and resumes from the saved cursor', async () => {
 const storage = new Map(); globalThis.localStorage = { getItem:k=>storage.get(k)??null, setItem:(k,v)=>storage.set(k,v) };
 const first = {...requested(), blockNumber:'0x64'}, nextId=fixtures[0].logs.filter(l=>D.decodeIntake(l).eventName==='Requested')[1].topics[1];
 const second = {...requested(body(),nextId),blockNumber:'0x65'};
 let head=100n, logs=[first], release, calls=[]; const casts=[];
 const client={ getChainId:async()=>1, getBlockNumber:async()=>head, getBlock:async()=>({timestamp:1792563203n}), getEnsName:async()=>null,
  request:async(req)=>{calls.push(req);const q=req.params[0];if(release) {const wait=release;release=null;await wait;} return q.topics[0] === '0x1c521a43c9b0f72a335bc80a6918abce08af7949ebbd1c41fe2a576074379063' ? logs.filter(l=>BigInt(l.blockNumber)>=BigInt(q.fromBlock)&&BigInt(l.blockNumber)<=BigInt(q.toBlock)) : [];}};
 const localConfig={...config,chains:[{...config.chains.find(c=>c.id===1),intakeFromBlock:90}],intake:{...config.intake,pollIntervalMs:60000}};
 const waitFor = async predicate => {for(let i=0;i<100&&!predicate();i++)await new Promise(r=>setTimeout(r,5));assert.ok(predicate());};
 const store=new LaunchStore(localConfig,{1:client},text=>casts.push(text));const stop=store.start();
 try {
  await waitFor(()=>!store.getSnapshot().chains[0].loading);assert.equal(store.getSnapshot().launches.length,1);assert.deepEqual(casts,[]);
  head=101n;logs=[first,{...base,blockNumber:'0x65'},second];
  let unblock;release=new Promise(r=>unblock=r);store.retry();await new Promise(r=>setTimeout(r,0));store.retry();unblock();
  await waitFor(()=>store.getSnapshot().launches.length===2&&JSON.parse(storage.get(cacheKey(1))).head==='101');
  assert.equal(casts.length,1);assert.match(casts[0],/PondGuard was requested on Robinhood Chain/);
  store.retry();await new Promise(r=>setTimeout(r,15));assert.equal(casts.length,1);
  const restored=new LaunchStore(localConfig,{1:client});assert.equal(restored.getSnapshot().launches.length,2);
  assert.equal(JSON.parse(storage.get(cacheKey(1))).cursor,'89');
  assert.ok(calls.every(c=>BigInt(c.params[0].toBlock)-BigInt(c.params[0].fromBlock)<10000n));
 } finally {stop();delete globalThis.localStorage;}
});


test('result launch UUIDs are preserved for evidence without inventing a numeric launch number',()=>{
 const id='702e6c9d-37ee-41ef-afcb-5d5e1af9f31b'; // Public Hamster Hour launch id, not a generated stand-in.
 const row=D.applyResult(launch(),{launch:{id}});assert.equal(row.launchId,id);assert.equal(row.launchNumber,null);
 assert.equal(D.applyResult(launch(),{launch:{id:'../../not-a-launch'}}).launchId,null);
});

test('configured windows start at Intake deployment and use 100,000 / 400,000 inclusive blocks',()=>{
 const ethereum=config.chains.find(c=>c.id===1), robinhood=config.chains.find(c=>c.id===4663);
 assert.equal(ethereum.rpcUrl,'https://rpc.mevblocker.io');assert.equal(ethereum.intakeFromBlock,26164897);assert.equal(ethereum.logRange,100000);
 assert.equal(robinhood.intakeFromBlock,85300000);assert.equal(robinhood.logRange,400000);
 for(const c of config.chains){const floor=BigInt(c.intakeFromBlock),size=BigInt(c.logRange),head=floor+size*3n+123n,ranges=[...backwardsRanges(floor,head,size)];
 assert.equal(ranges[0][1]-ranges[0][0]+1n,size);assert.equal(ranges.at(-1)[0],floor);for(let i=1;i<ranges.length;i++)assert.equal(ranges[i][1]+1n,ranges[i-1][0]);}
});
test('every failure splits logs to at most 1,000 blocks, including non-range HTTP errors',async()=>{
 const {readLogs}=await import('../web/src/chain/store.ts');const calls=[];
 const client={request:async({params:[q]})=>{const n=BigInt(q.toBlock)-BigInt(q.fromBlock)+1n;calls.push(n);if(n>1000n)throw new Error('HTTP 403 Archive requests require a personal token');return[];}};
 assert.deepEqual(await readLogs(client,config.intake.address,[],0n,7999n),[]);assert.deepEqual(calls,[8000n,4000n,2000n,1000n,1000n,2000n,1000n,1000n,4000n,2000n,1000n,1000n,2000n,1000n,1000n]);
 calls.length=0;client.request=async({params:[q]})=>{calls.push(BigInt(q.toBlock)-BigInt(q.fromBlock)+1n);throw new Error('offline');};await assert.rejects(readLogs(client,config.intake.address,[],0n,7999n),/offline/);assert.deepEqual(calls,[8000n,4000n,2000n,1000n]);
});
test('Completed is fetched once per shared window and matched even when seen before its older request',async()=>{
 const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 const requestedLog={...requested(),blockNumber:'0x5b'},completedLog={...completed(1,'REFUSED'),blockNumber:'0x6e'};const calls=[];
 const client={getChainId:async()=>1,getBlockNumber:async()=>119n,getBlock:async()=>({timestamp:1792563203n}),getEnsName:async()=>null,request:async({params:[q]})=>{calls.push(q);return (q.topics[0]===REQUEST_TOPIC?[requestedLog]:[completedLog]).filter(l=>BigInt(l.blockNumber)>=BigInt(q.fromBlock)&&BigInt(l.blockNumber)<=BigInt(q.toBlock));}};
 const site={...config,chains:[{...config.chains.find(c=>c.id===1),intakeFromBlock:90,logRange:10}],intake:{...config.intake,pollIntervalMs:60000}};
 const store=new LaunchStore(site,{1:client}),stop=store.start();
 try{for(let i=0;i<100&&store.getSnapshot().chains[0].loading;i++)await new Promise(r=>setTimeout(r,5));const state=store.getSnapshot();assert.equal(state.chains[0].error,null);assert.equal(state.chains[0].backfilling,false);assert.equal(state.launches[0].status,'failed');assert.equal(calls.length,6);assert.ok(calls.filter(c=>c.topics[0]===COMPLETE_TOPIC).every(c=>c.topics.length===1));}
 finally{stop();delete globalThis.localStorage;}
});

const reorg = JSON.parse(fs.readFileSync(new URL('fixtures/chain/reorg.json', import.meta.url), 'utf8'));
const eventually = async predicate => {
 for (let i = 0; i < 200 && !predicate(); i++) await new Promise(resolve => setTimeout(resolve, 5));
 assert.ok(predicate(), 'The chain store did not reach the expected state');
};
async function reorgStore(t, withCompletion = true, delayedResult = false) {
 const storage = new Map();
 globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
 t.after(() => { delete globalThis.localStorage; });
 const request = { ...requested(body('A')), blockNumber: reorg.requestBlock, blockHash: reorg.originalHash };
 const completion = { ...completed(), blockNumber: reorg.completionBlock, blockHash: reorg.originalHash, logIndex: '0x1' };
 const canonical = { head: BigInt(reorg.initialHead), requests: [request], completions: withCompletion ? [completion] : [], hashes: new Map([[reorg.requestBlock, reorg.originalHash], [reorg.completionBlock, reorg.originalHash]]), fail: false };
 let release;
 t.mock.method(globalThis, 'fetch', async () => {
  if (delayedResult) await new Promise(resolve => { release = resolve; });
  return Response.json(reorg.result);
 });
 const client = { getChainId: async () => 1, getBlockNumber: async () => canonical.head, getEnsName: async () => null,
  readContract: async ({functionName}) => { assert.equal(functionName, 'hook'); return reorg.result.launch.hookAddress; },
  getBlock: async ({ blockNumber }) => ({ timestamp: 1792563203n, hash: canonical.hashes.get(String(blockNumber)) }),
  request: async ({ params: [q] }) => {
   if (canonical.fail) throw new Error('RPC unavailable');
   return (q.topics[0] === REQUEST_TOPIC ? canonical.requests : canonical.completions).filter(log => BigInt(log.blockNumber) >= BigInt(q.fromBlock) && BigInt(log.blockNumber) <= BigInt(q.toBlock));
  } };
 const site = { ...config, chains: [{ ...config.chains.find(c => c.id === 1), intakeFromBlock: 90 }], intake: { ...config.intake, pollIntervalMs: 60000 } };
 const clients = { 1: client, 4663: client };
 const store = new LaunchStore(site, clients), stop = store.start(); t.after(stop);
 await eventually(() => !store.getSnapshot().chains[0].loading);
 if (withCompletion) await eventually(() => delayedResult ? !!release : store.getSnapshot().launches[0]?.status === 'live');
 const saved = () => JSON.parse(storage.get(cacheKey(1)));
 const refresh = async () => { const previous = saved().head; canonical.head++; store.retry(); await eventually(() => saved().head !== previous); };
 return { store, canonical, storage, saved, refresh, request, completion, restore: () => new LaunchStore(site, clients), release: () => release?.() };
}
for (const removed of [false, true]) test(`reorg fixture retracts an orphaned request from rows and persistent records (${removed ? 'removed log' : 'absent on reread'})`, async t => {
 const h = await reorgStore(t, false);
 assert.equal(h.store.getSnapshot().launches.length, 1);
 h.storage.set('hooks-store:pending', JSON.stringify([{ chainId: 1, requestId: realRequest.requestId, payer: realRequest.payer }]));
 h.canonical.requests = removed ? [{ ...h.request, removed: true }] : [];
 await h.refresh();
 assert.deepEqual(h.store.getSnapshot().launches, []);
 assert.deepEqual(h.saved().records, {});
 assert.deepEqual(JSON.parse(h.storage.get('hooks-store:pending')), []);
 assert.deepEqual(h.restore().getSnapshot().launches, []);
});
for (const removed of [false, true]) test(`reorg fixture retracts an orphaned completion and Live result (${removed ? 'removed log' : 'absent on reread'})`, async t => {
 const h = await reorgStore(t);
 h.canonical.completions = removed ? [{ ...h.completion, removed: true }] : [];
 await h.refresh();
 const row = h.store.getSnapshot().launches[0], entry = h.saved().records[row.requestId];
 assert.equal(row.status, 'requested'); assert.equal(row.hookAddress, null); assert.equal(row.completion, undefined);
 assert.equal(entry.completed, undefined); assert.equal(entry.result, undefined); assert.equal(entry.hookRead, undefined); assert.deepEqual(h.saved().completions, {});
 assert.equal(h.restore().getSnapshot().launches[0].status, 'requested');
});
for (const event of ['request', 'completion']) test(`refresh checks the canonical block hash of a cached ${event}, even outside the overlap`, async t => {
 const h = await reorgStore(t);
 h.canonical.head = BigInt(reorg.deepHead);
 await h.refresh(); // Move the overlap beyond both retained events first.
 h.canonical.hashes.set(event === 'request' ? reorg.requestBlock : reorg.completionBlock, reorg.replacementHash);
 if (event === 'request') h.canonical.requests = []; else h.canonical.completions = [];
 await h.refresh();
 if (event === 'request') {
  assert.deepEqual(h.store.getSnapshot().launches, []); assert.deepEqual(h.saved().records, {});
  assert.deepEqual(h.restore().getSnapshot().launches, []);
 } else {
  assert.equal(h.store.getSnapshot().launches[0].status, 'requested');
  assert.equal(h.saved().records[realRequest.requestId].result, undefined);
  assert.equal(h.restore().getSnapshot().launches[0].status, 'requested');
 }
});
test('a failed canonical reread preserves cached events and reports the read error', async t => {
 const h = await reorgStore(t); h.canonical.fail = true; h.canonical.requests = []; h.store.retry();
 await eventually(() => !!h.store.getSnapshot().chains[0].error);
 assert.equal(h.store.getSnapshot().launches[0].status, 'live'); assert.ok(h.saved().records[realRequest.requestId].requested);
});
test('late result enrichment cannot resurrect a completion removed by a reorg', async t => {
 const h = await reorgStore(t, true, true); h.canonical.completions = []; await h.refresh(); h.release();
 await new Promise(resolve => setTimeout(resolve, 15));
 assert.equal(h.store.getSnapshot().launches[0].status, 'requested');
 assert.equal(h.saved().records[realRequest.requestId].result, undefined);
 assert.equal(h.restore().getSnapshot().launches[0].hookAddress, null);
});
