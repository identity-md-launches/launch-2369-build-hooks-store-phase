import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newDraft, addBlock, body, compose } from '../src/lib/compose.ts';
import { matchProvenLaunch, provenChanges, provenLine, provenRequestLine, provenForLaunch, parseProvenLaunches, LAUNCH_WAIT } from '../src/lib/proven.ts';
import { readPromotionBalances, mergeAds, placementPosition, AD_PRICE } from '../web/src/chain/ads.ts';
const owner = '0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
const p = {launchId:'9f778988-4553-4ff6-99fb-706824bb9e31',launchNumber:2424,chainId:4663,type:'B',blocks:['swap-fee','anti-sniper','jar','pause'],repoUrl:'https://github.com/identity-md-launches/launch-2424-deploy-one-contract-pondsideguard.git',commit:'5a9f6a36d659084e084a8abc08a55213c9516f07',name:'PondsideGuard',verifiedAt:'2026-10-22'};
function draft(ids, type='B') { let d={...newDraft(),type,mode:'blocks',seeded:true}; d.settings={...d.settings,chain:4663,hname:'ReedHook',pool:50,token:owner};for(const id of ids)d=addBlock(d,id);return d; }
test('exact proven stack wins before a newer nearest launch; existing request sentence is retained',()=>{
 const d=draft(p.blocks),near={...p,launchNumber:2450,blocks:['swap-fee','pause']};
 assert.equal(matchProvenLaunch(d,[near,p]),p);assert.equal(provenLine(p,d),provenLine(p));
 assert.match(compose({...d,proven:p},owner),/keep its behavior, apply the parameters and rules of this request/);
});
test('nearest counts unique common ids, requires behavior, ties to the newer launch and ignores source order',()=>{
 const d=draft(['swap-fee','cooldown','pause']);
 const low={...p,launchNumber:2455,blocks:['swap-fee']};
 const newer={...p,launchNumber:2449};
 assert.equal(matchProvenLaunch(d,[low,p,newer]),newer);assert.equal(matchProvenLaunch(d,[newer,p,low]),newer);
 assert.deepEqual(provenChanges(d,p),{remove:['anti-sniper','jar'],add:['cooldown']});
 assert.equal(provenLine(p,d),'Adapted from a proven launch: PondsideGuard (launch 2424, audited 2026-10-22): the swarm removes Anti-sniper window, Buyback jar and adds Cooldown');
 const b=body({...d,proven:p},owner);assert.equal(b.repoUrl,p.repoUrl);assert.equal(b.baseCommit,p.commit);assert.equal(provenRequestLine(p,b.objective),provenLine(p,d));
 assert.match(b.objective,/remove Anti-sniper window, Buyback jar; add Cooldown;/);assert.match(b.objective,/audit it as a new hook/);
 assert.equal(matchProvenLaunch(d,[{...p,type:'C'}]),undefined);
 assert.equal(matchProvenLaunch(d,[{...p,blocks:['oracle']}]),undefined);
 assert.equal(matchProvenLaunch(draft(['pause'],'A'),[{...p,type:'A',blocks:['token','swap-fee']}]),undefined);
});
test('words-only drafts and explicit own source never automatically match',()=>{
 const d=draft(p.blocks);assert.equal(matchProvenLaunch({...d,mode:'prompt'},[p]),undefined);
 assert.equal(matchProvenLaunch({...d,settings:{...d.settings,repo:p.repoUrl}},[p]),undefined);
 assert.equal(matchProvenLaunch(draft([]),[p]),undefined);
 assert.equal(matchProvenLaunch(draft(['token'],'A'),[{...p,type:'A',blocks:['token']}]),undefined);
});
test('nearest applies for A, B and C; exact requires chain, adaptation may change chain',()=>{
 for(const type of ['A','B','C']) {const d=draft(['swap-fee','pause'],type);const candidate={...p,type,blocks:[...(type==='A'?['token']:[]),'swap-fee','jar']};assert.equal(matchProvenLaunch(d,[candidate]),candidate);assert.match(provenLine(candidate,d),/^Adapted/);}
 const d=draft(p.blocks);d.settings.chain=1;assert.equal(matchProvenLaunch(d,[p]),p);assert.match(provenLine(p,d),/^Adapted/);
});
test('index accepts .git URLs and unknown extra fields; marks the indexed launch itself',()=>{
 const rows=parseProvenLaunches({launches:[{...p,tokenAddress:owner,deployerAddress:owner,poolId:'extra',notes:'extra'}]});assert.equal(rows.length,1);
 assert.equal(provenForLaunch({launchId:p.launchId,launchNumber:null,chainId:4663},rows),rows[0]);
 assert.equal(provenForLaunch({launchId:'another',launchNumber:2450,chainId:4663},rows),undefined);
 assert.equal(provenForLaunch({launchId:p.launchId,launchNumber:null,chainId:1},rows),undefined);
});
test('wait and audited-stack copy; only one paid launch and no instant offer',()=>{
 assert.equal(LAUNCH_WAIT,'Usually 30 to 90 minutes, sometimes up to 3 hours. From a proven launch, usually less.');
 const builder=fs.readFileSync(new URL('../web/src/Builder.tsx',import.meta.url),'utf8');assert.match(builder,/This stack starts from audited code\./);assert.equal((builder.match(/Continue to launch</g)||[]).length,1);assert.match(builder,/0\.5 IMD/);
 for(const file of ['Builder.tsx','LaunchReview.tsx','Landing.tsx'])assert.doesNotMatch(fs.readFileSync(new URL('../web/src/'+file,import.meta.url),'utf8'),/Create instantly|instant lane|free launch|gas only/i);
});
test('reading and data faces are self-hosted with fallbacks, old fonts are removed',()=>{
 const css=fs.readFileSync(new URL('../web/src/styles.css',import.meta.url),'utf8');assert.doesNotMatch(css,/Pixelify Sans|VT323/);assert.match(css,/--body: 'Atkinson Hyperlegible', Verdana/);assert.match(css,/--mono: 'JetBrains Mono', ui-monospace, Menlo/);assert.match(css,/font-variant-numeric: tabular-nums/);
 for(const font of ['atkinson-hyperlegible-latin-400','atkinson-hyperlegible-latin-700','jetbrains-mono-latin'])assert.equal(fs.readFileSync(new URL('../public/fonts/'+font+'.woff2',import.meta.url)).subarray(0,4).toString(),'wOF2');
 for(const font of ['pixelify-sans-latin','vt323-latin'])assert.equal(fs.existsSync(new URL('../public/fonts/'+font+'.woff2',import.meta.url)),false);
});
test('promotion balances read wallet balanceOf and escrow available on the payment chain',async()=>{
 const calls=[],placements='0x1da6f19ee08365813651de6420603fea4fbcdc9a',imd='0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7';
 const client={readContract:async q=>{calls.push(q);return q.functionName==='balanceOf'?2000000000000000000n:AD_PRICE;}};
 assert.deepEqual(await readPromotionBalances(client,{placements},imd,owner),{wallet:2000000000000000000n,deposited:AD_PRICE});
 assert.deepEqual(calls.map(q=>[q.address,q.functionName,q.args]),[[imd,'balanceOf',[owner]],[placements,'available',[owner]]]);
});
test('both promotion chains merge by hook chain and address, sum totals, rank once and retain placements',()=>{
 const now=BigInt(Math.floor(Date.now()/1000)),hook='0xc97c5b51eb09961aedebea6a1eb41b62fff560cc';
 const a={chainId:1,total:AD_PRICE,placement:{id:1n,status:1,startsAt:now-10n,endsAt:now+100n},listing:{chainId:4663n,hook},launch:{id:'ReedGuard'}};
 const b={...a,chainId:4663,total:AD_PRICE*2n,placement:{...a.placement,endsAt:now+1000n},listing:{...a.listing,hook:hook.toUpperCase()}};
 const c={...a,total:AD_PRICE*2n,placement:{...a.placement,id:2n},listing:{chainId:1n,hook},launch:{id:'another hook'}};
 const rows=mergeAds([c,b,a]);assert.equal(rows.length,2);assert.equal(rows[0].total,AD_PRICE*3n);assert.equal(rows[0].placements.length,2);assert.equal(rows[0].placement.endsAt,b.placement.endsAt);assert.equal(a.placement.endsAt,now+100n);
 assert.deepEqual(placementPosition([a,b,c],b),{rank:1,total:2});assert.deepEqual(placementPosition([a,b,c],c),{rank:2,total:2});
});

test('merged total ties use the earliest purchase even when a later placement has the largest boost',()=>{
 const now=BigInt(Math.floor(Date.now()/1000)),hook='0xc97c5b51eb09961aedebea6a1eb41b62fff560cc';
 const late={chainId:1,total:AD_PRICE*2n,placement:{id:10n,status:1,startsAt:now,endsAt:now+100n},listing:{chainId:4663n,hook},launch:{id:'ReedGuard'}};
 const early={...late,total:AD_PRICE,placement:{...late.placement,id:1n}};
 const other={...late,total:AD_PRICE*3n,placement:{...late.placement,id:2n},listing:{chainId:1n,hook},launch:{id:'another hook'}};
 const rows=mergeAds([late,other,early]);assert.equal(rows[0].launch.id,'ReedGuard');assert.deepEqual(placementPosition([late,other,early],early),{rank:1,total:2});
});
