import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {encodeAbiParameters,parseAbiParameters,stringToHex,toHex,encodeFunctionResult,decodeFunctionData,erc20Abi,zeroAddress,type Abi} from 'viem';
import site from '../../public/site-config.json' with {type:'json'};
import index from '../../tests/fixtures/job12/proven-index.json' with {type:'json'};
import events from '../../tests/fixtures/job12/ads-events.json' with {type:'json'};
import {newDraft,addBlock,body,type Draft} from '../../src/lib/compose';
import {LAUNCH_WAIT,PROVEN_LAUNCHES_URL,provenLine,parseProvenLaunches} from '../../src/lib/proven';
import {placementsAbi,registryAbi,AD_PRICE} from '../src/chain/ads';
import {REQUEST_TOPIC,COMPLETE_TOPIC} from '../src/chain/store';
import {genericRules,hidingStylesheet} from '../../scripts/easylist-check.mjs';
import {interceptChains,injectedOwner,storeLogs,head,owner,hook,token,requestId,rpcRoute} from './chain-fixture';
const proven=parseProvenLaunches(index),reed=proven.find(p=>p.launchNumber===2449)!;
const out=fileURLToPath(new URL('../../tests/results/job12/',import.meta.url));
const job13Out=fileURLToPath(new URL('../../tests/results/job13/',import.meta.url));
const job13Scratch=fileURLToPath(new URL('../../test/scratch/job13/',import.meta.url));
function draft(ids=['swap-fee','pause','max-swap']):Draft {let d={...newDraft(),type:'B' as const,mode:'blocks' as const,seeded:true};d.settings={...d.settings,chain:4663,hname:'ReedHook',owner};for(const id of ids)d=addBlock(d,id) as typeof d;return d;}
async function builder(page:Page,d=draft()) {
 await interceptChains(page,{noLogs:true});await injectedOwner(page);
 await page.route('**/site-config.json',r=>r.fulfill({json:{...site,ads:{},chains:site.chains.map(c=>({...c,intakeFromBlock:head-20}))}}));
 await page.route(PROVEN_LAUNCHES_URL,r=>r.fulfill({json:index}));
 await page.route(`${site.relayUrl}/**`,r=>r.fulfill({json:{entries:[]}}));
 await page.route(`${site.relayUrl}/import`,r=>{const q=r.request().postDataJSON();return r.fulfill({json:{ok:true,source:{repoUrl:q.url,baseCommit:q.ref}}});});
 const checked:any[]=[];
 await page.route(`${site.relayUrl}/check`,r=>{checked.push(r.request().postDataJSON());return r.fulfill({json:{facts:[],plan:[],blockers:[],suggestions:[]}});});
 await page.addInitScript(d=>localStorage.setItem('hooks-store:draft:v2',JSON.stringify(d)),d);
 await page.goto('#builder');await page.locator('#connect').click();await page.getByRole('button',{name:'Fork Wallet',exact:true}).click();await expect(page.locator('.hookcard .proven-line')).toHaveText(provenLine(reed,d));
 return checked;
}
for(const [width,height] of [[390,844],[1100,800],[1920,1080]]) test(`nearest match, exact sheet and paid swarm review at ${width}`,async({page})=>{
 fs.mkdirSync(out,{recursive:true});await page.setViewportSize({width,height});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const checked=await builder(page);
 await expect(page.locator('.proven-line')).toContainText('the swarm removes Cooldown and adds Max swap size');
 await expect(page.locator('.hookcard')).toContainText(LAUNCH_WAIT);await expect(page.locator('.audited-stack')).toHaveText('This stack starts from audited code.');
 await expect(page.locator('.cost')).toHaveText('Swarm fee 0.5 IMDGas 2 tx');
 await page.getByRole('button',{name:'Show exact text',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.locator('#composed')).toContainText(`Start from the audited source at ${reed.repoUrl} commit ${reed.commit}: remove Cooldown; add Max swap size;`);
 await expect(page.locator('#composed')).toContainText('audit it as a new hook.');await page.screenshot({path:`${out}/nearest-sheet-${width}.jpg`,type:'jpeg',quality:65});
 await page.keyboard.press('Escape');await page.locator('.proven-line').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/nearest-builder-${width}.jpg`,type:'jpeg',quality:65});await expect(page.getByRole('button',{name:'Show exact text',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Check with the swarm (free)',exact:true}).click();await expect(page.locator('.swarm-panel')).toContainText('No blockers reported');
 expect(checked[0].input.repoUrl).toBe(reed.repoUrl);expect(checked[0].input.baseCommit).toBe(reed.commit);
 await page.getByRole('button',{name:'Continue to launch',exact:true}).click();await expect(page.locator('.launch-review .proven-line')).toContainText('Adapted from a proven launch');await expect(page.locator('.launch-review')).toContainText(LAUNCH_WAIT);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(errors).toEqual([]);
});
for(const [width,height] of [[320,900],[390,844],[768,900],[1100,800],[1366,768],[1440,900],[1920,1080],[2560,1440]]) test(`fluid Builder edges, fixed type and card fit at ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await builder(page);
 await page.evaluate(()=>document.fonts.ready);
 const g=await page.locator('.builder-page').evaluate(el=>{const r=el.getBoundingClientRect(),c=getComputedStyle(el);const b=document.querySelector('.hookcol')!.getBoundingClientRect();return {x:r.x,width:r.width,left:r.x+parseFloat(c.paddingLeft),right:r.right-parseFloat(c.paddingRight),card:b.width};});
 const gutter=Math.min(48,Math.max(16,width*.03)),offset=Math.max(0,(width-1800)/2);
 expect(g.width).toBe(Math.min(width,1800));expect(Math.abs(g.left-offset-gutter)).toBeLessThan(1);expect(Math.abs(width-offset-gutter-g.right)).toBeLessThan(1);
 if(width>=1100){expect(Math.abs(g.card-Math.min(520,Math.max(420,width*.28)))).toBeLessThan(1);await page.locator('.hookcard').scrollIntoViewIfNeeded();const c=(await page.locator('.hookcard').boundingBox())!;expect(c.y+c.height).toBeLessThanOrEqual(height+1);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.locator('.step h2').first().evaluate(el=>getComputedStyle(el).fontSize)).toBe('13px');
});
for(const [width,height] of [[1920,1080],[1366,768]]) test(`seven findings do not leave a phantom scroll gap at ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await interceptChains(page,{noLogs:true});await page.goto('#builder');await expect(page.locator('.findings .finding')).toHaveCount(7);await page.evaluate(()=>document.fonts.ready);
 const col=page.locator('.hookcol');
 for(const end of [false,true]){if(end)await col.evaluate(el=>el.scrollTop=el.scrollHeight);const g=await col.evaluate(el=>({actual:el.scrollHeight,expected:Math.max(el.clientHeight,el.lastElementChild!.getBoundingClientRect().bottom-el.getBoundingClientRect().top+el.scrollTop+parseFloat(getComputedStyle(el).paddingBottom))}));expect(Math.abs(g.actual-g.expected)).toBeLessThanOrEqual(2);}
});
async function hookFixture(page:Page) {
 const d=draft(reed.blocks),logs=storeLogs();const requested={...logs.requested,data:encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'),[stringToHex(JSON.stringify(body(d,owner))),owner,'0x00000000',token,500000000000000000n])};
 await interceptChains(page,{result:{complete:true,jobId:'reed-build',launch:{id:reed.launchId,launchNumber:2449,chainId:4663,hookAddress:hook}}});
 await page.route(PROVEN_LAUNCHES_URL,r=>r.fulfill({json:index}));
 await page.route('**/site-config.json',r=>r.fulfill({json:{...site,chains:site.chains.map(c=>({...c,intakeFromBlock:head-20}))}}));
 await page.route(`${site.relayUrl}/**`,r=>r.fulfill({json:{entries:[]}}));
 await page.route(`${site.relayUrl}/launches/${reed.launchId}`,r=>r.fulfill({json:{id:reed.launchId,chainId:4663,launchNumber:2449,status:'live',artifacts:[{role:'hook',name:'ReedHook',address:hook}]}}));
 await page.route(rpcRoute(site.chains[1]),async r=>{const q=r.request().postDataJSON();if(q.method==='eth_getLogs'&&q.params[0].topics[0]===REQUEST_TOPIC)return r.fulfill({json:{jsonrpc:'2.0',id:q.id,result:[requested]}});return r.fallback();});
 return requested;
}
for(const [width,height] of [[390,844],[1100,800],[1920,1080]])test(`proven catalog card and hook preload their audited blocks at ${width}`,async({page})=>{
 await page.setViewportSize({width,height});await hookFixture(page);await page.goto('#catalog');const card=page.locator('.grid .card');await expect(card.locator('.proven')).toHaveText('PROVEN');
 await card.getByRole('link',{name:/View/}).click();await expect(page.locator('.detail-pills .proven')).toHaveText('PROVEN');
 await page.getByRole('button',{name:'Build one like this',exact:true}).click();await expect(page.locator('.builder-page')).toBeVisible();expect(await page.locator('#stack .rule:not(.token)').evaluateAll(els=>els.map(e=>e.getAttribute('data-block')))).toEqual(reed.blocks);
 await page.goto('#catalog');await card.getByRole('button',{name:'Build one like this',exact:true}).click();await expect(page.locator('.builder-page')).toBeVisible();expect(await page.locator('#stack .rule:not(.token)').count()).toBe(3);
});
for(const width of [390,1440])test(`loaded reading, rule, address, request and cost fonts at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await builder(page);await page.evaluate(()=>document.fonts.ready);
 const family=(selector:string)=>page.locator(selector).first().evaluate(el=>getComputedStyle(el).fontFamily);
 expect(await family('.builder-page .head p')).toContain('Atkinson Hyperlegible');expect(await family('.rule .txt > span:not(.pill)')).toContain('JetBrains Mono');expect(await family('.cost strong')).toContain('JetBrains Mono');expect(await family('#composed')).toContain('JetBrains Mono');
 await page.getByRole('button',{name:'Open all',exact:true}).click();expect(await family('.rule .body p')).toContain('Atkinson Hyperlegible');expect(await family('#s-owner')).toContain('JetBrains Mono');
 expect(await page.evaluate(()=>document.fonts.check('17px "Atkinson Hyperlegible"')&&document.fonts.check('19px "JetBrains Mono"'))).toBe(true);
 await hookFixture(page);await page.goto(`#hook/1/${requestId}`);await expect(page.locator('.hook-page')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 expect(await family('.hook-page p')).toContain('Atkinson Hyperlegible');expect(await family('.address-value code')).toContain('JetBrains Mono');expect(await family('.hook-request pre')).toContain('JetBrains Mono');expect(await family('.reading')).toContain('JetBrains Mono');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
for(const [i,number,launchId,jobId] of [[0,2454,'24f55ec3-e64c-43b7-a095-977c9c5dbfc3','7f951ad8-ac62-41f0-b968-79737c96623e'],[1,2456,'3836b728-fabb-40bc-a57f-180416ed7f84','a9818b4d-a1fe-4ef7-bab0-82509f56b0ac']] as const)test(`public ads request ${number} resolves its Requested event without a wallet`,async({page})=>{
 await interceptChains(page,{noLogs:true});const e=events[i],id=e.requested.topics[1],chainId=i===0?4663:1;let targeted=0;
 await page.route('**/site-config.json',r=>r.fulfill({json:{...site,ads:{},chains:site.chains.map(c=>({...c,intakeFromBlock:Number(BigInt(e.requested.blockNumber))-10}))}}));
 await page.route(rpcRoute(site.chains[1]),async r=>{const q=r.request().postDataJSON();let result;
 if(q.method==='eth_blockNumber')result=toHex(BigInt(e.completed.blockNumber)+10n);
 else if(q.method==='eth_getLogs'){const t=q.params[0].topics;if(t[1]?.toLowerCase()===id)targeted++;result=t[0]===REQUEST_TOPIC?[e.requested]:t[0]===COMPLETE_TOPIC?[e.completed]:[];}
 else if(q.method==='eth_getBlockByNumber')result={number:q.params[0],hash:e.requested.blockHash,timestamp:'0x6a500000',transactions:[]};else return r.fallback();return r.fulfill({json:{jsonrpc:'2.0',id:q.id,result}});
 });
 await page.route('https://ipfs.imd.fun/**',r=>r.fulfill({json:{complete:true,jobId,launch:{id:launchId,chainId}}}));
 await page.route(`${site.relayUrl}/**`,r=>r.fulfill({json:{entries:[]}}));await page.route(`${site.relayUrl}/intake/1/${e.requested.transactionHash}`,r=>r.fulfill({json:{entries:[{requestId:id,action:'launch.open',admission:{result:{jobId}}}]}}));await page.route(`${site.relayUrl}/jobs/${jobId}`,r=>r.fulfill({json:{launch:{id:launchId}}}));await page.route(`${site.relayUrl}/launches/${launchId}`,r=>r.fulfill({json:{id:launchId,launchNumber:number,chainId,status:'live',artifacts:[]}}));
 await page.goto(`#hook/1/${id}`);await expect(page.getByRole('heading',{name:`Contracts launch ${number}, live`,exact:true})).toBeVisible();await expect(page.getByText('Not a hook: a contracts launch for the store',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Open IMD explorer',exact:true})).toHaveAttribute('href',`https://explorer.imd.fun/jobs/${jobId}`);expect(targeted).toBeGreaterThan(0);await expect(page.locator('#connect')).toHaveText('Connect');
});
async function promotionFixture(page:Page,options:{balance?:bigint;both?:boolean;deposit?:bigint;proceeds?:bigint;first429?:boolean;allowance?:bigint}={}) {
 await hookFixture(page);const writes:{chain:number;name:string;args:any[];to:string}[]=[],reads:{chain:number;name:string}[]=[];
 let walletBalance=options.balance??2000000000000000000n,deposited=options.deposit??0n,allowance=options.allowance??0n,boosted=0n,proceeds=options.proceeds??0n,listed=!!options.both,purchased=!!options.both,tx=0;
 const now=BigInt(Math.floor(Date.now()/1000)),hashes=new Map<string,any>();
 const metadata={name:'ReedHook',sourceRef:reed.repoUrl,testRef:'',reviewRef:'',auditRef:'',callbackMask:0n,callbackDisclosure:'beforeSwap, afterSwap',feeDisclosure:'1% ETH',adminDisclosure:'Owner may pause',labels:['swap-fee','pause','cooldown']};
 const placement=(chain:number)=>({id:1n,listingId:1n,revision:1n,payer:owner,recipient:owner,startsAt:now,endsAt:now+86400n,closedAt:0n,refund:0n,status:1,label:'0x236164'});
 const listing={chainId:4663n,hook,owner,proposedOwner:zeroAddress,revision:1n,active:true};
 const abiFor=(to:string,chain:number):Abi|undefined=>to.toLowerCase()===(site.ads as any)[chain].placements?placementsAbi:to.toLowerCase()===(site.ads as any)[chain].registry?registryAbi:to.toLowerCase()===site.chains.find(c=>c.id===chain)!.imdAddress?erc20Abi:undefined;
 const answer=(q:any,chain:number)=>{
  let result:any;
  if(q.method==='eth_call'){
   const abi=abiFor(q.params[0].to,chain);if(!abi)return null;
   const d=decodeFunctionData({abi,data:q.params[0].data}),name=d.functionName;reads.push({chain,name});
   const active=chain===1?purchased:!!options.both;
   const total1=options.both?AD_PRICE*2n:AD_PRICE+boosted;const values:any={proceeds:chain===1?proceeds:0n,createListing:1n,approve:true,purchase:1n,cancel:AD_PRICE,imd:site.chains.find(c=>c.id===chain)!.imdAddress,proceedsRecipient:owner,balanceOf:chain===1?walletBalance:0n,available:chain===1?deposited:0n,allowance,listingFor:listed?1n:0n,getListing:listing,getMetadata:metadata,placementCount:active?1n:0n,featured:[[placement(chain)],[chain===1?total1:AD_PRICE],2n],getPlacement:placement(chain),rankOf:chain===1?total1:AD_PRICE};
   result=name in values?encodeFunctionResult({abi,functionName:name,result:values[name]}):'0x';
  }else if(q.method==='eth_sendTransaction'){
   const req=q.params[0],abi=abiFor(req.to,chain)!;const d=decodeFunctionData({abi,data:req.data}),args=d.args as any[];writes.push({chain,name:d.functionName,args,to:req.to});
   if(d.functionName==='createListing'){expect(args[0]).toBe(4663n);expect(String(args[1]).toLowerCase()).toBe(hook);listed=true;}
   if(d.functionName==='approve')allowance=args[1];
   if(d.functionName==='deposit'){walletBalance-=args[0];deposited+=args[0];allowance-=args[0];}
   if(d.functionName==='purchase'){deposited-=AD_PRICE;purchased=true;}
   if(d.functionName==='boost'){deposited-=args[1];boosted+=args[1];}
   if(d.functionName==='cancel'){purchased=false;deposited+=AD_PRICE;boosted=0n;}
   if(d.functionName==='withdrawProceeds'){walletBalance+=args[0];proceeds-=args[0];}
   if(d.functionName==='withdraw'){walletBalance+=args[0];deposited-=args[0];}
   result=toHex(++tx,{size:32});hashes.set(result,{req});
  }else if(q.method==='eth_getTransactionReceipt'){
   const hash=q.params[0];if(!hashes.has(hash))result=null;else result={transactionHash:hash,transactionIndex:'0x0',blockHash:storeLogs().requested.blockHash,blockNumber:toHex(head),from:owner,to:hashes.get(hash).req.to,cumulativeGasUsed:'0x5208',gasUsed:'0x5208',contractAddress:null,logs:[],logsBloom:'0x'+'0'.repeat(512),status:'0x1',effectiveGasPrice:'0x1',type:'0x2'};
  }else if(q.method==='eth_chainId')result=toHex(chain);
  else if(q.method==='eth_blockNumber')result=toHex(head);
  else if(q.method==='eth_getTransactionByHash'){const h=q.params[0];result={...hashes.get(h)?.req,hash:h,from:owner,nonce:'0x1',blockHash:storeLogs().requested.blockHash,blockNumber:toHex(head),transactionIndex:'0x0',value:'0x0',gas:'0x5208',gasPrice:'0x1',input:hashes.get(h)?.req.data,type:'0x0',v:'0x1b',r:toHex(1,{size:32}),s:toHex(1,{size:32})};}
  else return null;
  return {jsonrpc:'2.0',id:q.id,result};
 };
 let rejected429=0;
 for(const c of site.chains){
  // The first public endpoint can answer 429; the fallback list must make that invisible.
  await page.route(rpcRoute(c),async r=>{const q=r.request().postDataJSON(),result=Array.isArray(q)?q.map((x:any)=>answer(x,c.id)):answer(q,c.id);if(Array.isArray(result)?result.every(Boolean):result)return r.fulfill({json:result});return r.fallback();});
  // Registered last, so it wins: the first endpoint rate-limits every placement and balance read.
  if(options.first429)await page.route(c.rpcUrls[0],r=>{const q=r.request().postDataJSON();if(!(Array.isArray(q)?q:[q]).some((x:any)=>x.method==='eth_call'))return r.fallback();rejected429++;return r.fulfill({status:429,body:'Too Many Requests'});});
 }
 const walletRpc='http://127.0.0.1:4173/preview/controlled-wallet';await page.route(walletRpc,r=>{const q=r.request().postDataJSON();const res=answer(q,1);return r.fulfill({json:res??{jsonrpc:'2.0',id:q.id,error:{code:-32601,message:'Unsupported fixture method '+q.method}}});});
 await injectedOwner(page,owner,walletRpc,'0x1');
 await page.goto('#mine');await page.locator('#connect').click();await page.getByRole('button',{name:'Fork Wallet',exact:true}).click();await page.locator('#promotion-chain').selectOption('1');await expect(page.locator('#promotion-chain')).toHaveValue('1');
 return {writes,reads,rejected:()=>rejected429};
}
test('two labelled balances and the low-wallet note use controlled RPC readings',async({page})=>{
 await page.setViewportSize({width:390,height:844});const {reads}=await promotionFixture(page,{balance:50000000000000000n});const p=page.locator('#promotions');
 await expect(p.locator('.wallet-imd')).toHaveText('In your wallet on Ethereum: 0.05 IMD');await expect(p.locator('.deposited-imd')).toHaveText('Deposited for promotions: 0 IMD');await expect(p.locator('.low-imd')).toHaveText('Not enough IMD on Ethereum for a placement. Get IMD on Ethereum outside the store, then deposit it here.');await expect(p).toContainText('DEPOSIT moves IMD from your wallet into the placements contract. PROMOTE and BOOST spend from it; WITHDRAW returns what is unspent.');
 expect(reads.some(r=>r.chain===1&&r.name==='balanceOf')).toBe(true);expect(reads.some(r=>r.chain===1&&r.name==='available')).toBe(true);
 fs.mkdirSync(job13Out,{recursive:true});await p.locator('.promotion-balance').scrollIntoViewIfNeeded();await page.screenshot({path:`${job13Out}/promotions-balances-390.jpg`,type:'jpeg',quality:60});
 await page.locator('#promotion-chain').selectOption('4663');await expect(p.locator('.wallet-imd')).toHaveText('In your wallet on Robinhood Chain: 0 IMD');await expect(p.locator('.low-imd')).toHaveText('Not enough IMD on Robinhood Chain for a placement. Get IMD on Robinhood Chain outside the store, then deposit it here.');expect(reads.some(r=>r.chain===4663&&r.name==='balanceOf')).toBe(true);
});
test('Robinhood hook promoted with IMD on Ethereum from the deposit, then both balances refresh',async({page})=>{
 await page.setViewportSize({width:390,height:844});const {writes,reads}=await promotionFixture(page);const p=page.locator('#promotions');await expect(p.locator('.wallet-imd')).toHaveText('In your wallet on Ethereum: 2 IMD');
 const row=p.locator('.promotion-row').filter({hasText:'ReedHook'});await expect(row.locator('.pill.chain')).toHaveText('Robinhood Chain');
 await page.locator('#deposit-amount').fill('0.1');await p.getByRole('button',{name:'Deposit',exact:true}).click();
 await expect(p.locator('.wallet-imd')).toHaveText('In your wallet on Ethereum: 1.9 IMD');await expect(p.locator('.deposited-imd')).toHaveText('Deposited for promotions: 0.1 IMD');
 await row.getByRole('button',{name:'Promote · 0.1 IMD / 24h',exact:true}).click();await expect(p.locator('.function-feedback')).toHaveText('ReedHook is promoted for 24 hours.');await expect(p.locator('.deposited-imd')).toHaveText('Deposited for promotions: 0 IMD');
 expect(writes.map(w=>w.name)).toEqual(['approve','deposit','createListing','purchase']);expect(writes.every(w=>w.chain===1)).toBe(true);expect(reads.filter(r=>r.name==='balanceOf').length).toBeGreaterThanOrEqual(4);
 fs.mkdirSync(out,{recursive:true});await p.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/ethereum-promotion-390.jpg`,type:'jpeg',quality:65});
 await page.goto(`#hook/1/${requestId}`);await expect(page.locator('.detail-pills .paid-tag')).toContainText('active placement');
});
test.describe('job 13 promotions panel',()=>{
 test('exact proven blocks before choosing a chain, then both deploy chains',async({page})=>{
  await page.setViewportSize({width:390,height:844});const d=draft(reed.blocks);d.settings.chain=null;
  await builder(page,d);const line=page.locator('.hookcard .proven-line');
  const title=`${reed.name} (launch ${reed.launchNumber}, audited ${reed.verifiedAt})`;
  await expect(page.locator('#s-chain')).toHaveValue('');await expect(line).toHaveText(`Built from a proven launch: ${title}`);
  await expect(line).not.toContainText('none');
  await page.locator('#s-chain').selectOption('1');await expect(line).toHaveText(`Adapted from a proven launch: ${title}: the same blocks, redeployed on Ethereum`);
  await page.locator('#s-chain').selectOption('4663');await expect(line).toHaveText(`Built from a proven launch: ${title}`);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 });
 for(const width of [320,390,1440])test(`deposit 0.25, promote, boost 0.05, cancel and withdraw at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const {writes}=await promotionFixture(page);const p=page.locator('#promotions');
  await expect(p.locator('.wallet-imd')).toHaveText('In your wallet on Ethereum: 2 IMD');
  const row=p.locator('.promotion-row').filter({hasText:'ReedHook'});
  await expect(row.getByRole('button',{name:'Promote · 0.1 IMD / 24h',exact:true})).toBeDisabled();await expect(row.locator('.promote-note')).toHaveText('Deposit at least 0.1 IMD first');
  await expect(p.locator('.earned-imd')).toHaveText('Earned as recipient: 0 IMD');await expect(p.getByRole('button',{name:'Withdraw proceeds',exact:true})).toBeDisabled();
  await page.locator('#deposit-amount').fill('3');await expect(p.locator('#deposit-note')).toHaveText('More than your wallet holds on this chain.');await expect(p.getByRole('button',{name:'Deposit',exact:true})).toBeDisabled();
  await page.locator('#deposit-amount').fill('0.25');await p.getByRole('button',{name:'Deposit',exact:true}).click();
  await expect(p.locator('.deposited-imd')).toHaveText('Deposited for promotions: 0.25 IMD');await expect(p.locator('.wallet-imd')).toHaveText('In your wallet on Ethereum: 1.75 IMD');
  await expect(row.locator('.promote-note')).toHaveCount(0);await row.getByRole('button',{name:'Promote · 0.1 IMD / 24h',exact:true}).click();
  await expect(row).toContainText('24h left · 0.1 IMD total paid · Rank 1 of 1');await expect(p.locator('.deposited-imd')).toHaveText('Deposited for promotions: 0.15 IMD');
  await row.getByRole('button',{name:'Boost',exact:true}).click();await row.getByLabel('Boost amount (IMD), from your deposit').fill('0.05');
  await expect(row).toContainText('A boost is non-refundable');await expect(row.getByRole('button',{name:'Confirm boost',exact:true})).toBeDisabled();
  await row.getByLabel('I confirm this boost is non-refundable.').check();await row.getByRole('button',{name:'Confirm boost',exact:true}).click();
  await expect(row).toContainText('0.15 IMD total paid');await expect(p.locator('.deposited-imd')).toHaveText('Deposited for promotions: 0.1 IMD');
  await row.getByRole('button',{name:'Cancel',exact:true}).click();await expect(row).toContainText('All boosts are forfeited');
  // The required EasyList screenshot is retained below; this inspection-only frame stays in scratch.
  if(width===390){fs.mkdirSync(job13Scratch,{recursive:true});await row.scrollIntoViewIfNeeded();await page.screenshot({path:`${job13Scratch}/promotions-cancel-390.jpg`,type:'jpeg',quality:60});}
  await row.getByRole('button',{name:'Confirm cancellation',exact:true}).click();
  await expect(row.locator('.placement-running')).toHaveCount(0);await expect(p.locator('.deposited-imd')).toHaveText('Deposited for promotions: 0.2 IMD');
  await p.getByRole('button',{name:'Withdraw',exact:true}).click();await expect(p.locator('.deposited-imd')).toHaveText('Deposited for promotions: 0 IMD');await expect(p.locator('.wallet-imd')).toHaveText('In your wallet on Ethereum: 1.95 IMD');
  expect(writes.map(w=>w.name)).toEqual(['approve','deposit','createListing','purchase','boost','cancel','withdraw']);
  await expect(p.locator('[role="alert"]')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(errors).toEqual([]);
 });
 test('an allowance that covers the amount sends one deposit, no approval',async({page})=>{
  const {writes}=await promotionFixture(page,{allowance:AD_PRICE});const p=page.locator('#promotions');
  await page.locator('#deposit-amount').fill('0.1');await p.getByRole('button',{name:'Deposit',exact:true}).click();await expect(p.locator('.deposited-imd')).toHaveText('Deposited for promotions: 0.1 IMD');
  expect(writes.map(w=>w.name)).toEqual(['deposit']);
  await page.locator('#deposit-amount').fill('0.05');await p.getByRole('button',{name:'Deposit',exact:true}).click();await expect(p.locator('.deposited-imd')).toHaveText('Deposited for promotions: 0.15 IMD');
  expect(writes.map(w=>w.name)).toEqual(['deposit','approve','deposit']);
 });
 test('a wallet with 0 deposit sees PROMOTE disabled with the note',async({page})=>{
  await page.setViewportSize({width:390,height:844});await promotionFixture(page,{deposit:0n});const p=page.locator('#promotions');
  await expect(p.locator('.deposited-imd')).toHaveText('Deposited for promotions: 0 IMD');
  const button=p.locator('.promotion-row').first().getByRole('button',{name:'Promote · 0.1 IMD / 24h',exact:true});await expect(button).toBeDisabled();
  await expect(p.locator('.promote-note').first()).toHaveText('Deposit at least 0.1 IMD first');await expect(button).toHaveAttribute('aria-describedby',/promote-note-/);
  await expect(p.getByRole('button',{name:'Withdraw',exact:true})).toBeDisabled();
 });
 test('proceeds earned as recipient are withdrawn with WITHDRAW PROCEEDS',async({page})=>{
  const {writes}=await promotionFixture(page,{proceeds:AD_PRICE});const p=page.locator('#promotions');
  await expect(p.locator('.earned-imd')).toHaveText('Earned as recipient: 0.1 IMD');await p.getByRole('button',{name:'Withdraw proceeds',exact:true}).click();
  await expect(p.locator('.earned-imd')).toHaveText('Earned as recipient: 0 IMD');await expect(p.locator('.wallet-imd')).toHaveText('In your wallet on Ethereum: 2.1 IMD');
  expect(writes.map(w=>w.name)).toEqual(['withdrawProceeds']);
 });
 test('EasyList generic rules injected as a stylesheet leave the placement and open-slot cards visible',async({page})=>{
  await page.setViewportSize({width:390,height:844});await promotionFixture(page,{both:true});const rules=genericRules();
  await page.goto('#store');await page.addStyleTag({content:hidingStylesheet(rules)});
  const card=page.locator('.featured-group:not([aria-hidden]) .placement-card:not(.placement-slot)');await expect(card).toBeVisible();await expect(card).toContainText('#AD');
  await expect(page.locator('.featured-group:not([aria-hidden]) .placement-slot')).toBeVisible();await expect(page.locator('#featured')).toBeVisible();
  const names=await page.evaluate(()=>{const c=new Set<string>(),i=new Set<string>();for(const el of document.querySelectorAll('*')){el.classList.forEach(x=>c.add(x));if(el.id)i.add(el.id);}return {classes:[...c],ids:[...i]};});
  expect(names.classes.filter(c=>rules.classes.has(c))).toEqual([]);expect(names.ids.filter(i=>rules.ids.has(i))).toEqual([]);
  await page.goto('#mine');await page.addStyleTag({content:hidingStylesheet(rules)});await expect(page.locator('#promotions')).toBeVisible();await expect(page.locator('.promotion-row').first()).toBeVisible();
  fs.mkdirSync(job13Out,{recursive:true});await page.goto('#store');await page.addStyleTag({content:hidingStylesheet(rules)});await page.locator('#featured').scrollIntoViewIfNeeded();await page.screenshot({path:`${job13Out}/featured-easylist-390.jpg`,type:'jpeg',quality:60});
 });
 test('the first RPC answering 429 is invisible: strip and panel still render',async({page})=>{
  const {rejected}=await promotionFixture(page,{both:true,first429:true});
  await expect(page.locator('.wallet-imd')).toHaveText('In your wallet on Ethereum: 2 IMD');
  await page.goto('#store');const card=page.locator('.featured-group:not([aria-hidden]) .placement-card:not(.placement-slot)');await expect(card).toHaveCount(1);await expect(card).toContainText('ReedHook');
  await expect(page.locator('#featured')).not.toContainText('Could not read promotions');expect(rejected()).toBeGreaterThan(0);
 });
});
test('one featured card ranks the summed hook total and own placements show both payment chains',async({page})=>{
 await promotionFixture(page,{both:true});await expect(page.locator('.placement-running')).toHaveCount(2);await expect(page.locator('.promotion-list')).toContainText('Paid on Ethereum');await expect(page.locator('.promotion-list')).toContainText('Paid on Robinhood Chain');await expect(page.locator('.placement-running').first()).toContainText('Rank 1 of 1');
 await page.goto('#store');const visible=page.locator('.featured-group:not([aria-hidden]) .placement-card:not(.placement-slot)');await expect(visible).toHaveCount(1);await expect(visible).toContainText('ReedHook');
 await page.goto(`#hook/1/${requestId}`);await expect(page.locator('.detail-pills .paid-tag')).toContainText('active placement');
});
