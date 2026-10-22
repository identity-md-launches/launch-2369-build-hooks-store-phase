import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../src/lib/compose.ts';
import { checkConsistency } from '../src/lib/safety.ts';
import { normalizeFeeAmounts, writtenFeeRates, writtenFeeTargets } from '../src/lib/writtenFees.ts';
import { applyLaunchRecord, requestContext } from '../web/src/chain/decode.ts';
import { functionsFromAbi, managementError } from '../web/src/chain/manage.ts';
import { activePlacement, readAds, listingMetadata, placementPosition, AD_PRICE, sortAds } from '../web/src/chain/ads.ts';
const payer='0x5bff2a2fecd1d6152676813b21346238733beab1';
const draft=(type='A',ids=[])=>{let d={...C.newDraft(),type,mode:'blocks'};d.settings={...d.settings,chain:4663,pool:50,hname:'PondHook',token:payer};for(const id of ids)d=C.addBlock(d,id);return d;};
test('range-order access names the factory only for A and enables beforeAddLiquidity',()=>{
 for(const type of ['A','B','C'])for(const id of ['allowlist','open-at','hours','anti-sniper']){
  const d=draft(type,[id]),s=C.compose(d,payer);assert.match(s,new RegExp(`adding liquidity is allowed only to ${type==='A'?'the factory and the owner':'the owner'}`));assert.match(s,/removing liquidity is never restricted/);assert.match(s,/Enable beforeAddLiquidity/);
 }
 for(const id of ['max-buy','max-swap','cooldown'])assert.match(C.compose(draft('A',[id]),payer),/A one-sided liquidity position is not a swap: it is not limited by this rule and pays no hook fee/);
});
test('every fee sentence specifies the equivalent exact-input and exact-output fee',()=>{
 for(const id of ['swap-fee','fee-dir','fee-size','fee-vol','jar','pot','fee-fade']){
  const d=draft('B'),b=C.entry(id);assert.ok(b,id);const s=C.sentenceOf(b,C.context(d,payer));assert.match(s,/exact input A pays A × rate ÷ \(10000 \+ rate\)/);assert.match(s,/exact output A pays A × rate ÷ \(10000 − rate\), computed with mulDiv/);
 }
});
test('fixed-fee requests reject the dynamic flag, dynamic block requests do not',()=>{
 for(const type of ['A','B','C']){assert.match(C.compose(draft(type,['pause']),payer),/dynamic-fee flag \(0x800000\) is rejected at initialization/);if(C.BY_ID['lp-fee'].types.includes(type))assert.doesNotMatch(C.compose({...draft(type),blocks:[...draft(type).blocks,C.entry('lp-fee')]},payer),/dynamic-fee flag \(0x800000\) is rejected/);}
});
test('written percent, ratio and in-every amounts are recognized as one percent',()=>{
 for(const amount of ['1 pct','1 pct.','1/100','one in every hundred','1 in 100','one out of a hundred']){
  const d=draft('B');d.mode='prompt';d.prompt=`Take ${amount} of every swap for the owner.`;assert.deepEqual(writtenFeeRates(d.prompt),{buy:1,sell:1},amount);assert.doesNotMatch(C.compose(d,payer),/Hook fee rate: 0%/);assert.deepEqual(checkConsistency(C.body(d,payer)),[],amount);
 }
 for(const amount of ['some','a tiny amount','eleventy percent']){const d=draft('B');d.mode='prompt';d.prompt=`Take ${amount} of every swap for the owner.`;assert.ok(checkConsistency(C.body(d,payer)).some(f=>f.code==='fee-rate'),amount);assert.doesNotMatch(C.compose(d,payer),/Hook fee rate: 0%/);}
});
test('unknown active payees need an address for all supported receiving verbs',()=>{
 for(const verb of ['receives','accrues','gets','earns','keeps','collects','is paid']){const d=draft('B');d.mode='prompt';d.prompt=`Alice ${verb} 1% of every swap.`;assert.ok(writtenFeeTargets(d.prompt).includes('Alice'),verb);assert.ok(checkConsistency(C.body(d,payer)).some(f=>f.code==='recipient'),verb);}
});
test('2448 record maps roles and computes the seeded PoolKey id',()=>{
 const record=JSON.parse(fs.readFileSync(new URL('../evidence/launch-5-launch-live.json',import.meta.url)));
 const l=applyLaunchRecord({type:'A',launchId:record.id,chainId:4663,request:record.jobs[0].objective,completion:{status:0},status:'in-progress',jobIds:[],txHashes:[],currencies:[]},record);
 assert.equal(l.hookAddress,'0x5a9e7a61c45d2c615162fa57931bcbc06d9b20cc');assert.equal(l.tokenAddress,'0xe7244bfb99c7ad49c5a40eaeedb215cb47dde85b');assert.equal(l.distributorAddress,'0x29760ee79ca59cec260da5e476ef03a137fc66b6');assert.equal(l.poolId,'0xccab6575b5cdd5798731f62f9299c442f954366e91b9513386d83e249cb99843');assert.equal(l.status,'live');assert.equal(l.sourceCommit,record.sourceCommit);
});
test('build links use job ids and never the unsupported launches path',()=>{
 const s=fs.readFileSync(new URL('../web/src/Hook.tsx',import.meta.url),'utf8');assert.doesNotMatch(s,/explorer\.imd\.fun\/launches/);assert.match(s,/explorer\.imd\.fun\/jobs\/\$\{encodeURIComponent\(job\)\}/);assert.doesNotMatch(s,/>Hook page<|>Launch page</);assert.match(s,/intakeJob/);
});
test('source ABI controls retain catalog labels but use the actual contract arguments',()=>{
 const abi=[{type:'function',name:'claimFees',inputs:[],outputs:[],stateMutability:'nonpayable'},{type:'function',name:'pause',inputs:[],outputs:[],stateMutability:'nonpayable'},{type:'function',name:'unpause',inputs:[],outputs:[],stateMutability:'nonpayable'},{type:'function',name:'paused',inputs:[],outputs:[{type:'bool'}],stateMutability:'view'}];
 const rows=functionsFromAbi([C.entry('swap-fee'),C.entry('pause')],abi);assert.equal(rows.length,4);assert.ok(rows.every(r=>!r.abi.inputs.length));assert.equal(managementError(new Error('execution reverted'),'claimFees'),'Nothing to claim yet');assert.equal(managementError(new Error('execution reverted'),'buyback'),'The jar is below its threshold');
});
test('featured paging skips stale cancelled and expired IDs and pins metadata revision',async()=>{
 const calls=[], now=BigInt(Math.floor(Date.now()/1000));const hook='0x5a9e7a61c45d2c615162fa57931bcbc06d9b20cc';
 const p=id=>({id,listingId:id,revision:2n,payer,recipient:payer,startsAt:now-10n,endsAt:id===2n?now-1n:now+1000n,closedAt:0n,refund:0n,status:id===1n?2:1,label:'0x236164'});
 const client={getBlockNumber:async()=>123n,readContract:async q=>{calls.push(q);const id=q.args?.[0];switch(q.functionName){case 'placementCount':return 201n;case 'featured':return id===1n?[[p(1n),p(2n)], [99n,99n],101n]:id===101n?[[],[],201n]:[[p(201n)],[AD_PRICE],202n];case 'getPlacement':return p(id);case 'rankOf':return AD_PRICE+5n;case 'getListing':return {chainId:4663n,hook,owner:payer,revision:3n,active:false};case 'getMetadata':assert.equal(q.args[1],2n);return {name:'Pinned name'};default:throw Error(q.functionName);}}};
 const rows=await readAds(client,4663,{registry:payer,placements:payer});assert.equal(rows.length,1);assert.equal(rows[0].placement.id,201n);assert.equal(rows[0].metadata.name,'Pinned name');assert.equal(rows[0].total,AD_PRICE+5n);assert.equal(calls.filter(q=>q.functionName==='featured').length,3);assert.ok(calls.every(q=>q.blockNumber===123n));
 assert.equal(activePlacement(p(1n)),false);assert.equal(activePlacement(p(2n)),false);
});

test('rank is the combined store strip position across chains, even when IDs collide',()=>{
 const p={id:1n,status:1,endsAt:BigInt(Math.floor(Date.now()/1000)+1000)};
 const eth={chainId:1,placement:p,total:AD_PRICE*2n,launch:{id:'Ethereum hook'}};
 const robinhood={chainId:4663,placement:p,total:AD_PRICE,launch:{id:'Robinhood hook'}};
 const outside={chainId:1,placement:{...p,id:2n},total:AD_PRICE*10n};
 assert.deepEqual(placementPosition([robinhood,outside,eth],robinhood),{rank:2,total:2});
 assert.deepEqual(placementPosition([robinhood,outside,eth],eth),{rank:1,total:2});
 assert.deepEqual(placementPosition([robinhood,outside,eth],outside),{rank:0,total:2});
});
