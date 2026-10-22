import {test,expect} from '@playwright/test';
import {encodeAbiParameters,parseAbiParameters,stringToHex,toFunctionSelector,zeroAddress,getAddress,toHex,encodeFunctionResult,decodeFunctionData,type Abi} from 'viem';
import record2448 from '../../evidence/launch-5-launch-live.json' with {type:'json'};
import {placementsAbi,registryAbi} from '../src/chain/ads';
import controls2424 from '../../src/abi/PondsideGuard-2424-controls.json' with {type:'json'};
import site from '../../public/site-config.json' with {type:'json'};
import {body,newDraft,addBlock} from '../../src/lib/compose';
import {REQUEST_TOPIC} from '../src/chain/store';
import {head,hook,token,owner,requestId,route,storeLogs,interceptChains,injectedOwner} from './chain-fixture';
const poolId='0xccab6575b5cdd5798731f62f9299c442f954366e91b9513386d83e249cb99843';

test('type A reaches Live from 2448 record and preselects the seeded pool',async({page})=>{
 const logs=storeLogs();const request={objective:record2448.jobs[0].objective,onchain:'univ4_hook',chainId:4663};
 const requested={...logs.requested,data:encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'),[stringToHex(JSON.stringify(request)),owner,'0x00000000',site.chains[1].imdAddress as `0x${string}`,500000000000000000n])};
 await interceptChains(page,{result:{jobId:record2448.jobs[0].id,launch:{id:record2448.id,chainId:4663}}});
 await page.route('**/site-config.json',r=>r.fulfill({json:{...site,ads:{},chains:site.chains.map(c=>({...c,intakeFromBlock:head-20}))}}));
 await page.route(`${site.relayUrl}/**`,r=>r.fulfill({json:{entries:[]}}));await page.route(`${site.relayUrl}/launches/${record2448.id}`,r=>r.fulfill({json:record2448}));
 await page.route(site.chains[1].rpcUrl,async r=>{const req=r.request().postDataJSON();if(req.method==='eth_getLogs'&&req.params[0].topics[0]===REQUEST_TOPIC)return r.fulfill({json:{jsonrpc:'2.0',id:req.id,result:[requested]}});return r.fallback();});
 await page.route(site.chains[0].rpcUrl,async r=>{const req=r.request().postDataJSON();if(req.method==='eth_getCode')return r.fulfill({json:{jsonrpc:'2.0',id:req.id,result:'0x6000'}});return r.fallback();});
 await page.goto(route);await expect(page.locator('.detail-pills')).toContainText('Live');await expect(page.locator('.timeline li').last()).toContainText('Launch record live; addresses from the record');
 await expect(page.locator('.addresses')).toContainText(getAddress('0x5a9e7a61c45d2c615162fa57931bcbc06d9b20cc'));
 await expect(page.getByLabel('Pool id for these controls',{exact:true})).toHaveValue(poolId);
});

test('a browsed page never creates a notification watch, while an own request can',async({page})=>{
 await interceptChains(page,{result:{launch:{id:'pending',chainId:1}}});await injectedOwner(page);
 await page.addInitScript(()=>{(window as any).Notification=class{static permission='granted';static async requestPermission(){return 'granted';}};});
 await page.goto(route);await expect(page.locator('.hook-page')).toBeVisible();await expect(page.locator('.notification-prompt')).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('hooks-store:notification-watch:v1'))).toBeNull();
 await page.locator('#connect').click();await page.getByRole('button',{name:'Fork Wallet',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('hooks-store:notification-watch:v1'))).toContain(requestId);
});

test('type C owner rereads after deployer resolves, omits distributor and offers pool opening',async({page})=>{
 await page.clock.install();await interceptChains(page,{result:{launch:{id:'2450',chainId:1}}});
 let d={...newDraft(),type:'C' as const,mode:'blocks' as const};d.settings={...d.settings,chain:1,hname:'LilyGuard',token,owner};d=addBlock(d,'pause') as typeof d;
 const logs=storeLogs(),requested={...logs.requested,data:encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'),[stringToHex(JSON.stringify(body(d,owner))),owner,'0x00000000',token,500000000000000000n])};
 await page.route('**/site-config.json',r=>r.fulfill({json:{...site,ads:{},chains:site.chains.map(c=>({...c,intakeFromBlock:head-20}))}}));
 await page.route(`${site.relayUrl}/**`,r=>r.fulfill({json:{entries:[]}}));
 await page.route(`${site.relayUrl}/launches/2450`,r=>r.fulfill({json:{id:'2450',chainId:1,status:'live',artifacts:[{role:'deployer',name:'LilyGuardDeployer',address:owner}]}}));
 let resolved=false,ownerReads=0;
 await page.route(site.chains[1].rpcUrl,async r=>{const q=r.request().postDataJSON();let result;
  if(q.method==='eth_getLogs'&&q.params[0].topics[0]===REQUEST_TOPIC)result=[requested];
  else if(q.method==='eth_call'&&q.params[0].data.slice(0,10)===toFunctionSelector('hook()'))result=encodeAbiParameters(parseAbiParameters('address'),[resolved?hook:zeroAddress]);
  else if(q.method==='eth_call'&&q.params[0].data.slice(0,10)===toFunctionSelector('owner()')){ownerReads++;expect(q.params[0].to.toLowerCase()).toBe(hook);result=encodeAbiParameters(parseAbiParameters('address'),[owner]);}
  else return r.fallback();
  await r.fulfill({json:{jsonrpc:'2.0',id:q.id,result}});
 });
 await page.goto(route);await expect(page.locator('.addresses')).toContainText('hook not deployed yet');expect(ownerReads).toBe(0);
 resolved=true;await page.clock.fastForward(21000);await expect(page.locator('.owner-address')).toContainText(getAddress(owner));expect(ownerReads).toBeGreaterThan(0);
 await expect(page.locator('.addresses dt').filter({hasText:'Distributor'})).toHaveCount(0);await expect(page.locator('.addresses')).toContainText('No pool yet; open one below');await expect(page.getByRole('heading',{name:'Open the pool',exact:true})).toBeVisible();
});

test('2424 ABI keeps global pause and claimFees usable while pool-dependent actions wait',async({page})=>{
 const calls=await interceptChains(page,{result:{launch:{id:'2424',chainId:1}}});await injectedOwner(page);
 let d={...newDraft(),type:'B' as const,mode:'blocks' as const};d.settings={...d.settings,chain:1,hname:'PondsideGuard',owner};for(const id of ['swap-fee','jar','pause'])d=addBlock(d,id) as typeof d;
 const logs=storeLogs(),requested={...logs.requested,data:encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'),[stringToHex(JSON.stringify(body(d,owner))),owner,'0x00000000',token,500000000000000000n])};
 await page.route('**/site-config.json',r=>r.fulfill({json:{...site,ads:{},chains:site.chains.map(c=>({...c,intakeFromBlock:head-20}))}}));
 await page.route(`${site.relayUrl}/**`,r=>r.fulfill({json:{entries:[]}}));
 const repo='https://github.com/identity-md-launches/launch-2424-deploy-one-contract-pondsideguard',commit='5a9f6a36d659084e084a8abc08a55213c9516f07';
 await page.route(`${site.relayUrl}/launches/2424`,r=>r.fulfill({json:{id:'2424',chainId:1,status:'live',sourceRepoUrl:repo,sourceCommit:commit,artifacts:[{role:'hook',name:'PondsideGuard',address:hook}]}}));
 await page.route(`https://raw.githubusercontent.com/identity-md-launches/launch-2424-deploy-one-contract-pondsideguard/${commit}/out/PondsideGuard.sol/PondsideGuard.json`,r=>r.fulfill({json:{abi:controls2424}}));
 await page.route(site.chains[1].rpcUrl,async r=>{const req=r.request().postDataJSON();if(req.method==='eth_getLogs'&&req.params[0].topics[0]===REQUEST_TOPIC)return r.fulfill({json:{jsonrpc:'2.0',id:req.id,result:[requested]}});return r.fallback();});
 await page.goto(route);await page.locator('#connect').click();await page.getByRole('button',{name:'Fork Wallet',exact:true}).click();
 const pause=page.locator('[data-function="pause"]'),claim=page.locator('[data-function="claimFees"]'),buyback=page.locator('[data-function="buyback"]');
 await expect(pause.locator('code')).toHaveText('pause()');await expect(pause.getByRole('button',{name:'Send',exact:true})).toBeEnabled();await expect(claim.locator('code')).toHaveText('claimFees()');
 await expect(buyback).toContainText('No pool uses this hook yet. Open a pool with it, or enter its pool id above.');await expect(buyback.locator('button')).toBeDisabled();
 expect(calls.filter(q=>q.method==='eth_call'&&q.params[0].data.startsWith(toFunctionSelector('jar(bytes32)')))).toHaveLength(0);
 await claim.getByRole('button',{name:'Send',exact:true}).click();await expect(claim).toContainText('Nothing to claim yet');
 expect(calls.some(q=>q.method==='eth_call'&&q.params[0].data===toFunctionSelector('claimFees()'))).toBe(true);
});

test('contract launches are plain My hooks rows and stay out of the hook catalog',async({page})=>{
 const logs=storeLogs();await interceptChains(page,{result:{jobId:'ad-contract-build',launch:{id:'2456',chainId:1}}});
 const request={onchain:'evm_contracts',chainId:1,objective:'Build two immutable contracts: HookListingRegistry and FeaturedPlacementsV2.'};const requested={...logs.requested,data:encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'),[stringToHex(JSON.stringify(request)),owner,'0x00000000',token,500000000000000000n])};
 await page.route('**/site-config.json',r=>r.fulfill({json:{...site,ads:{},chains:site.chains.map(c=>({...c,intakeFromBlock:head-20}))}}));await page.route(`${site.relayUrl}/**`,r=>r.fulfill({json:{entries:[]}}));
 await page.route(`${site.relayUrl}/launches/2456`,r=>r.fulfill({json:{id:'2456',chainId:1,status:'live',launchNumber:2456,artifacts:[{role:'other',name:'HookListingRegistry',address:site.ads['1'].registry},{role:'other',name:'FeaturedPlacementsV2',address:site.ads['1'].placements}]}}));
 await page.route(site.chains[1].rpcUrl,async r=>{const req=r.request().postDataJSON();if(req.method==='eth_getLogs'&&req.params[0].topics[0]===REQUEST_TOPIC)return r.fulfill({json:{jsonrpc:'2.0',id:req.id,result:[requested]}});return r.fallback();});
 await page.goto(`#mine?address=${owner}`);await expect(page.locator('.contracts-row')).toHaveText('Contracts launch 2456, live');await expect(page.locator('.contracts-row a')).toHaveAttribute('href','https://explorer.imd.fun/jobs/ad-contract-build');
 await page.goto(route);await expect(page.getByRole('heading')).toHaveText('Contracts launch 2456, live');await page.goto('#catalog');await expect(page.locator('.grid .card')).toHaveCount(0);
 await expect(page.locator('.ads, #promotions')).toHaveCount(0);
});


test('placements expire locally between refreshes and a missing chain never becomes the default',async({page})=>{
 await page.clock.install();await interceptChains(page);await injectedOwner(page,owner,undefined,'0x1237');
 const now=BigInt(Math.floor(Date.now()/1000));const ad={id:1n,listingId:1n,revision:1n,payer:owner,recipient:owner,startsAt:now-1n,endsAt:now+3n,closedAt:0n,refund:0n,status:1,label:'0x236164'};
 const listing={chainId:1n,hook,owner,proposedOwner:zeroAddress,revision:1n,active:true};
 const metadata={name:'Pinned ad',sourceRef:'',testRef:'',reviewRef:'',auditRef:'',callbackMask:0n,callbackDisclosure:'No callbacks',feeDisclosure:'No fees',adminDisclosure:'No owner powers',labels:[]};
 await page.route('**/site-config.json',r=>r.fulfill({json:{...site,relayUrl:null,ads:{'1':site.ads['1']},chains:site.chains.map(c=>({...c,intakeFromBlock:head-20}))}}));
 await page.route(site.chains[1].rpcUrl,async r=>{const req=r.request().postDataJSON();if(req.method!=='eth_call')return r.fallback();const to=req.params[0].to.toLowerCase();const abi=to===site.ads['1'].placements?placementsAbi:to===site.ads['1'].registry?registryAbi:null;if(!abi)return r.fallback();
  const decoded=decodeFunctionData({abi,data:req.params[0].data});const values:any={placementCount:1n,featured:[[ad],[100000000000000000n],2n],getPlacement:ad,rankOf:100000000000000000n,getListing:listing,getMetadata:metadata,available:0n,imd:site.chains[1].imdAddress,proceedsRecipient:owner};
  if(!(decoded.functionName in values))return r.fallback();const result=encodeFunctionResult({abi,functionName:decoded.functionName,result:values[decoded.functionName]});await r.fulfill({json:{jsonrpc:'2.0',id:req.id,result}});
 });
 await page.goto('#store');await expect(page.locator('.adcard:not(.slot)').first()).toContainText('Pinned ad');
 await page.clock.fastForward(4000);await expect(page.locator('.adcard:not(.slot)')).toHaveCount(0);
 await page.goto('#mine');await page.locator('#connect').click();await page.getByRole('button',{name:'Fork Wallet',exact:true}).click();await expect(page.getByLabel('Promotion chain',{exact:true})).toHaveValue('1');await expect(page.getByRole('button',{name:'Switch to Ethereum',exact:true})).toBeVisible();
});
