import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'node:http';
import { createPublicClient } from '../web/node_modules/viem/_esm/index.js';
import { launchFromRequested, applyCompleted } from '../web/src/chain/decode.ts';
import { deriveLaunchStatus, isPublicLaunch, pondNotice, REQUEST_PUBLIC_MS } from '../web/src/chain/visibility.ts';
import { parseLaunchRecords, matchingLaunchRecord, applySnapshotRecord, objectiveHash } from '../web/src/chain/records.ts';
import { applyJobRecord } from '../web/src/relay.ts';
import { logWindows, scanQueue, rpcBackoff, rpcTransport } from '../web/src/chain/clients.ts';
import { body, newDraft, addBlock, POOL_MANAGERS } from '../src/lib/compose.ts';
import { checkConsistency } from '../src/lib/safety.ts';
import site from '../public/site-config.json' with { type: 'json' };
const fixture = name => JSON.parse(fs.readFileSync(new URL(`fixtures/job14/${name}.json`, import.meta.url), 'utf8'));
const logs = fixture('pond-logs'), snapshot = fixture('launch-records'), records = parseLaunchRecords(snapshot);
const realLaunch = n => { const r = logs.requests.find(r => r.testLaunch === n); return launchFromRequested(r.log, 1, site.intake.launchAction, r.timestamp); };
const now = Date.parse('2026-10-23T05:00:00Z');
const old = realLaunch(4), young = { ...old, createdAt: new Date(now - 3600000).toISOString() };
const state = (patch = {}) => ({ ...old, ...patch });

for (const [name, patch, expected] of [
  ['live', { status: 'live' }, true],
  ['executing old request', { jobState: 'executing' }, true],
  ['completed job awaiting deployment', { jobState: 'completed' }, true],
  ['deploying launch', { launchRecordStatus: 'deploying' }, true],
  ['young requested without a record', { createdAt: young.createdAt }, true],
  ['old requested without a record', {}, false],
  ['exactly 24 hours old', { createdAt: new Date(now - REQUEST_PUBLIC_MS).toISOString() }, false],
  ['one millisecond under 24 hours', { createdAt: new Date(now - REQUEST_PUBLIC_MS + 1).toISOString() }, true],
  ['unknown Requested timestamp', { createdAt: null }, false],
  ['blocked young job', { ...young, jobState: 'blocked' }, false],
  ['cancelled job', { jobState: 'cancelled' }, false],
  ['failed job', { jobState: 'failed' }, false],
  ['superseded job', { jobState: 'superseded' }, false],
  ['needs_input on a node', { ...young, jobNeedsInput: true }, false],
  ['parked despite executing job', { jobState: 'executing', launchRecordStatus: 'parked' }, false],
  ['failed launch despite live pill', { status: 'live', launchRecordStatus: 'failed' }, false],
  ['failed completion 1 despite live record', { completion: { status: 1 }, launchRecordStatus: 'live' }, false],
  ['failed completion 2 despite running job', { completion: { status: 2 }, jobState: 'executing' }, false],
  ['live awaiting hook code', { type: 'A', status: 'checking', launchRecordStatus: 'live' }, true],
  ['completed event alone is not a running job', { status: 'in-progress', completion: { status: 0 } }, false],
]) test(`public rule: ${name}`, () => assert.equal(isPublicLaunch(state(patch), now), expected));

for (const n of [2, 3, 4]) test(`real stopped launch ${n}: job record excludes both young and stale requests`, () => {
  const row = realLaunch(n), job = fixture(`launch-${n}-job-blocked`);
  assert.equal(row.requestId, fixture(`launch-${n}.intake`).entries[0].requestId);
  for (const createdAt of [row.createdAt, young.createdAt]) {
    const stopped = applyJobRecord({ ...row, createdAt }, job);
    assert.equal(stopped.jobState, 'blocked'); assert.ok(stopped.jobNeedsInput);
    assert.ok(stopped.attentionReasons.some(reason => /needs_input/.test(reason)));
    assert.equal(isPublicLaunch(stopped, now), false); assert.equal(deriveLaunchStatus(stopped), 'requested');
    assert.equal(pondNotice(stopped, now), 'Not on the pond: IMD stopped this launch');
  }
});
test('needs_input is respected even when a node state is not failed', () => {
  assert.equal(isPublicLaunch(applyJobRecord(young, {state:'executing',nodes:[{state:'working',failureReason:'needs_input: clarify the owner'}]}), now), false);
});
test('Checking is public, uses its own status, then becomes Live on verified code', () => {
  const row = { ...realLaunch(5), status: 'in-progress', launchRecordStatus: 'live', hookCodeVerified: false };
  assert.equal(deriveLaunchStatus(row), 'checking');
  assert.equal(isPublicLaunch({ ...row, status: deriveLaunchStatus(row) }, now), true);
  assert.equal(deriveLaunchStatus({ ...row, hookCodeVerified: true }), 'live');
  assert.equal(deriveLaunchStatus({ ...row, completion: {status:2}, hookCodeVerified: true }), 'failed');
});
test('not-public notices distinguish failed from stopped; public pages have no notice', () => {
  assert.equal(pondNotice({ ...old, completion: {status:1} }, now), 'Not on the pond: this launch failed');
  assert.equal(pondNotice(young, now), null);assert.equal(pondNotice({...old,createdAt:null},now),null);
});

test('the captured real pond has exactly four matching live snapshot records', () => {
  const rows = logs.requests.map(r => launchFromRequested(r.log, 1, site.intake.launchAction, r.timestamp));
  assert.deepEqual(rows.filter(r => matchingLaunchRecord(r, records)).map(r => matchingLaunchRecord(r, records).launchNumber), [2424, 2448, 2449, 2450]);
  assert.equal(rows.map(row => { const record = matchingLaunchRecord(row, records); return record ? applySnapshotRecord(row, record) : row; }).filter(row => isPublicLaunch(row, now)).length, 4);
});
test('snapshot identity requires the exact UTF-8 objective, payer, kind, chain and known launch id', () => {
  const row = realLaunch(5), record = matchingLaunchRecord(row, records); assert.ok(record);
  for (const patch of [{request:row.request+' '},{payer:realLaunch(5).tokenAddress ?? '0xe7244bfb99c7ad49c5a40eaeedb215cb47dde85b'}, {chainId:1}, {kind:'evm_contracts'}, {launchId:records[0].launchId}]) assert.equal(matchingLaunchRecord({...row,...patch}, records), undefined);
  assert.equal(objectiveHash('hello'), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  assert.notEqual(objectiveHash('é'), objectiveHash('e\u0301'));
  assert.equal(matchingLaunchRecord({...row,payer:row.payer.toUpperCase()},records),record);
});
test('snapshot resolves deployer, token, distributor, source and seeded pool, preserving chain failure', () => {
  const row = realLaunch(5), record = matchingLaunchRecord(row, records), completion = logs.completions.find(c => c.topics[1] === row.requestId);
  const live = applySnapshotRecord(applyCompleted(row, completion), record);
  assert.equal(live.launchNumber,2448);assert.equal(live.hookAddress,record.artifacts.find(a=>a.role==='hook').address);
  assert.equal(live.poolId,'0xccab6575b5cdd5798731f62f9299c442f954366e91b9513386d83e249cb99843');
  assert.ok(live.tokenAddress && live.distributorAddress && live.sourceCommit);
  assert.equal(deriveLaunchStatus({...live,completion:{status:2}}),'failed');
  const b = realLaunch(6), bRecord = matchingLaunchRecord(b,records);
  assert.equal(applySnapshotRecord(b,bRecord).deployerAddress,bRecord.artifacts[0].address);
});
test('fallback snapshot running and stopped states drive the same public rule', () => {
  const row=realLaunch(4), record={...records[0],objectiveSha256:objectiveHash(row.request),paidBy:row.payer,kind:row.kind};
  for (const jobState of ['blocked','cancelled','failed','superseded']) assert.equal(isPublicLaunch(applySnapshotRecord(row,{...record,status:'parked',jobState}),now),false);
  assert.equal(isPublicLaunch(applySnapshotRecord(row,{...record,status:'building',jobState:'executing'}),now),true);
});
test('invalid snapshot envelopes and rows cannot resolve a launch', () => {
  assert.throws(()=>parseLaunchRecords({...snapshot,version:2}));assert.throws(()=>parseLaunchRecords({...snapshot,generatedAt:'yesterday'}));
  for(const patch of [{objectiveSha256:'ABC'},{paidBy:'missing'},{artifacts:[{}]},{launchId:'../unsafe'},{chainId:10}]) assert.equal(parseLaunchRecords({...snapshot,launches:[{...records[0],...patch}]}).length,0);
});

test('endpoint windows are inclusive, gap-free and within each configured maximum', () => {
  assert.deepEqual([...logWindows(0n,25000n,10000)],[[0n,9999n],[10000n,19999n],[20000n,25000n]]);
  for (const c of site.chains) for(const url of c.rpcUrls) {
    assert.ok(site.rpcLogRanges[url]>0);
    for(const [from,to] of logWindows(500n,BigInt(c.logRange)+500n,site.rpcLogRanges[url])) assert.ok(to-from+1n<=BigInt(site.rpcLogRanges[url]));
    if(url.includes('publicnode')) assert.equal(site.rpcLogRanges[url],10000);
  }
});
test('429 waits 2, 4, 8 seconds before failover; success resets the backoff', async () => {
  const events=[];let calls=0,clock=0;
  const guarded=rpcBackoff(async ms=>{events.push(ms);clock+=ms;},()=>clock);
  for(let i=0;i<3;i++)await assert.rejects(guarded(async()=>{events.push(`call${++calls}`);throw {cause:{status:429}};}));
  assert.deepEqual(events,['call1',2000,'call2',4000,'call3',8000]);
  assert.equal(await guarded(async()=> 'ok'),'ok');
  await assert.rejects(guarded(async()=>{throw {status:429};}));assert.equal(events.at(-1),2000);
  let other=0;await assert.rejects(guarded(async()=>{other++;throw new Error('offline');}));assert.equal(other,1);assert.equal(events.at(-1),2000);
});
test('the shared scan queue never runs more than two calls, including rejected scans', async () => {
  const enqueue=scanQueue(2);let active=0,maximum=0,completed=0;
  await Promise.allSettled(Array.from({length:12},(_,i)=>enqueue(async()=>{maximum=Math.max(maximum,++active);await new Promise(r=>setTimeout(r,3));active--;completed++;if(i===2)throw new Error('fixture failure');})));
  assert.equal(maximum,2);assert.equal(completed,12);assert.equal(active,0);
});
test('fallback splits for the endpoint in use and globally caps actual log requests', async t => {
  const calls=[];let active=0,maximum=0;
  const server=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const q=JSON.parse(raw);calls.push({path:req.url,...q.params[0]});maximum=Math.max(maximum,++active);await new Promise(r=>setTimeout(r,3));active--;res.setHeader('Content-Type','application/json');if(req.url==='/primary'){res.writeHead(503);res.end('{}');}else res.end(JSON.stringify({jsonrpc:'2.0',id:q.id,result:[]}));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const base=`http://127.0.0.1:${server.address().port}`,primary=base+'/primary',secondary=base+'/secondary';
  const client=createPublicClient({transport:rpcTransport([primary,secondary],{[primary]:20,[secondary]:3})});
  await Promise.all(Array.from({length:5},()=>client.request({method:'eth_getLogs',params:[{fromBlock:'0x0',toBlock:'0x9',topics:[]}]})));
  assert.ok(maximum<=2);assert.equal(calls.filter(c=>c.path==='/secondary').length,20);
  for(const c of calls.filter(c=>c.path==='/secondary')) assert.ok(BigInt(c.toBlock)-BigInt(c.fromBlock)+1n<=3n);
});

test('hook-only draft groups chain and missing owner into two causes', () => {
  let d={...newDraft(),type:'B',mode:'blocks',seeded:true};d.settings.hname='WordsmithHook';d=addBlock(d,'pause');
  const findings=checkConsistency(body(d));assert.deepEqual(findings.map(f=>f.code),['chain','owner']);
  assert.match(findings[1].message,/fee recipient, body owner and deployer constructor/);
  d.settings.chain=4663;assert.deepEqual(checkConsistency(body(d)).map(f=>f.code),['owner']);
  d.settings.owner=old.payer;assert.deepEqual(checkConsistency(body(d)),[]);assert.deepEqual(checkConsistency(body(d,old.payer)),[]);
  const bad=body(d,old.payer);bad.objective=bad.objective.replace(POOL_MANAGERS[4663],'(wrong manager)').replace('takes no salt argument','takes a salt argument');
  assert.ok(checkConsistency(bad).some(f=>f.code==='dependency'));assert.ok(checkConsistency(bad).some(f=>f.code==='deployer'));
  const wrongRecipient=body(d,old.payer);wrongRecipient.objective=wrongRecipient.objective.replace(`fee recipient ${old.payer.toLowerCase()}`,'fee recipient (missing)');
  assert.ok(checkConsistency(wrongRecipient).some(f=>f.code==='fee-recipient'));
});
