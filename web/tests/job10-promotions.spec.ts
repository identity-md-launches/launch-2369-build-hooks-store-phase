import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import {spawn, type ChildProcess} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import { createPublicClient, http, encodeFunctionData, type Abi, encodeAbiParameters, parseAbiParameters, stringToHex, toHex } from 'viem';
import registryAbi from '../../src/abi/HookListingRegistry.json' with {type:'json'};
import site from '../../public/site-config.json' with { type:'json' };
import { addBlock, body, newDraft } from '../../src/lib/compose';
import { REQUEST_TOPIC, COMPLETE_TOPIC } from '../src/chain/store';
import { injectedOwner, storeLogs, requestId, token } from './chain-fixture';
// This suite is run by check-ads-fork.mjs while its isolated Anvil fork is alive.
const statePath = new URL('../../test/scratch/ads-fork.json', import.meta.url);
let fork: any, runner: ChildProcess;
test.beforeAll(async()=>{
  test.setTimeout(90000);runner=spawn(process.execPath,[fileURLToPath(new URL('../scripts/check-ads-fork.mjs',import.meta.url)),'--serve-browser'],{stdio:['ignore','pipe','pipe']});
  await new Promise<void>((resolve,reject)=>{let output='';runner.stdout!.on('data',chunk=>{output+=String(chunk);if(output.includes('ADS_FORK_READY'))resolve();});runner.stderr!.on('data',chunk=>{output+=String(chunk);});runner.on('exit',code=>reject(new Error('Fork runner stopped: '+code+' '+output.slice(-500))));});
  fork=JSON.parse(fs.readFileSync(statePath,'utf8'));
});
test.afterAll(async()=>{runner?.kill('SIGTERM');});
const rpc = async (method: string, params: unknown[] = []) => {
  if (!fork) throw new Error('Run node web/scripts/check-ads-fork.mjs --with-browser to start the required isolated fork.');
  const res = await fetch(fork.rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});const data=await res.json();if(data.error)throw Error(data.error.message);return data.result;
};
let snapshot: string;
test.beforeEach(async()=>{snapshot=await rpc('evm_snapshot');});
test.afterEach(async()=>{await rpc('evm_revert',[snapshot]);});
async function setup(page: Page) {
  const logs=storeLogs();const height=Number(BigInt(await rpc('eth_blockNumber')));
  let d=newDraft();d.mode='blocks';d.settings={...d.settings,chain:4663,pool:50,owner:fork.owner};d=addBlock(d,'swap-fee');
  const requested={...logs.requested,blockNumber:toHex(height-8),data:encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'),[stringToHex(JSON.stringify(body(d,fork.owner))),fork.owner,'0x00000000',fork.imd,500000000000000000n])};
  const completed={...logs.completed,blockNumber:toHex(height-5)};
  await injectedOwner(page,fork.owner,fork.rpc,'0x1237');
  await page.route('**/site-config.json',r=>r.fulfill({json:{...site,relayUrl:null,ads:{'4663':{registry:fork.registry,placements:fork.placements,launchNumber:2454,commit:site.ads['4663'].commit}},chains:site.chains.map(c=>({...c,intakeFromBlock:height-20}))}}));
  await page.route('https://raw.githubusercontent.com/**',r=>r.abort());await page.route('https://api.imd.fun/swarm',r=>r.fulfill({status:503}));
  await page.route('https://ipfs.imd.fun/**',r=>r.fulfill({json:{launch:{id:'2448',launchNumber:2448,chainId:4663,hookAddress:fork.hook,tokenAddress:token},delivery:{repoUrl:'https://github.com/identity-md-launches/launch-2448-launch-test-test-uniswap'}}}));
  const handler=async(r:any)=>{
    const data=r.request().postDataJSON(),chain=r.request().url().includes('robinhood')?4663:1;
    const answer=async(req:any)=>{
      let result;
      if(req.method==='eth_chainId')result=toHex(chain);
      else if(req.method==='eth_getLogs' && req.params[0].address.toLowerCase()===site.intake.address){const q=req.params[0];result=chain===1?(q.topics[0]===REQUEST_TOPIC?[requested]:q.topics[0]===COMPLETE_TOPIC?[completed]:[]).filter(l=>BigInt(l.blockNumber)>=BigInt(q.fromBlock)&&BigInt(l.blockNumber)<=BigInt(q.toBlock)):[];}
      else if(req.method==='eth_getBlockByNumber'&&[requested.blockNumber,completed.blockNumber].includes(req.params[0]))result={number:req.params[0],hash:requested.blockHash,timestamp:toHex(Math.floor(Date.now()/1000)),transactions:[]};
      else if(chain===1 && req.method==='eth_call')return {jsonrpc:'2.0',id:req.id,error:{code:3,message:'ENS fixture unavailable'}};
      else {try{result=await rpc(req.method,req.params);}catch(e){return {jsonrpc:'2.0',id:req.id,error:{code:3,message:String(e)}};}}
      return {jsonrpc:'2.0',id:req.id,result};
    };
    const res=Array.isArray(data)?await Promise.all(data.map(answer)):await answer(data);await r.fulfill({json:res});
  };
  await page.route(site.chains[0].rpcUrl,handler);await page.route(site.chains[1].rpcUrl,handler);
  await page.goto('#mine');await page.locator('#connect').click();await page.getByRole('button',{name:'Fork Wallet',exact:true}).click();
  await expect(page.locator('.mine-list')).toContainText('Pondside');
}

test('a completed promotion can start a fresh checkout without reloading My hooks', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 900 });
  await setup(page);
  const panel = page.locator('#promotions');
  const toggle = panel.getByRole('button', { name: 'Promote a hook', exact: true });
  await toggle.click();
  await panel.getByLabel(/Your live hook on/).selectOption({ label: 'Pondside (POND)' });
  await panel.getByRole('button', { name: '1. Create or use free listing', exact: true }).click();
  await panel.getByRole('button', { name: '2. Approve & deposit 0.1 IMD', exact: true }).click();
  await panel.getByRole('button', { name: '3. Purchase 24 hours · 0.1 IMD', exact: true }).click();
  await expect(panel).toContainText('Your #ad placement is active.', { timeout: 15000 });
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await toggle.click();
  await expect(panel.getByLabel(/Your live hook on/)).toBeEnabled();
  await expect(panel.getByLabel(/Your live hook on/)).toHaveValue('');
  await expect(panel.locator('.promotion-steps [aria-current="step"]')).toContainText('Free listing');
  await expect(panel.locator('.listing-review')).toHaveCount(0);
  await expect(panel.getByText('Your #ad placement is active.', { exact: false })).toHaveCount(0);
  await expect(panel.getByText('Pinned proceeds recipient:', { exact: true })).toHaveCount(0);
  await panel.getByLabel(/Your live hook on/).selectOption({ label: 'Pondside (POND)' });
  await expect(panel.getByRole('button', { name: '1. Create or use free listing', exact: true })).toBeEnabled();
  await panel.getByRole('button', { name: '1. Create or use free listing', exact: true }).click();
  await expect(panel.getByRole('button', { name: '2. Approve & deposit 0.1 IMD', exact: true })).toBeEnabled();
});
for(const width of [320,390,1440])test(`real promotion wallet flow at ${width}px`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await setup(page);const panel=page.locator('#promotions');await panel.getByRole('button',{name:'Promote a hook',exact:true}).click();
  await panel.getByLabel(/Your live hook on/).selectOption({label:'Pondside (POND)'});
  await panel.getByRole('button',{name:'1. Create or use free listing',exact:true}).click();
  await expect(panel.getByRole('button',{name:'2. Approve & deposit 0.1 IMD',exact:true})).toBeEnabled({timeout:15000});
  await panel.getByRole('button',{name:'2. Approve & deposit 0.1 IMD',exact:true}).click();
  await expect(panel.getByRole('button',{name:'3. Purchase 24 hours · 0.1 IMD',exact:true})).toBeEnabled({timeout:20000});
  fs.mkdirSync('../artifacts/screenshots',{recursive:true});
  await panel.getByRole('button',{name:'3. Purchase 24 hours · 0.1 IMD',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`../artifacts/screenshots/purchase-${width}.jpg`,type:'jpeg',quality:72});
  await panel.getByRole('button',{name:'3. Purchase 24 hours · 0.1 IMD',exact:true}).click();await expect(panel).toContainText('Your #ad placement is active.',{timeout:15000});
  await expect(panel.locator('.promotion-row')).toHaveCount(1);await expect(panel.locator('.promotion-row')).toContainText('0.1 IMD total');
  const client=createPublicClient({transport:http(fork.rpc)});
  const purchasedMetadata=await client.readContract({address:fork.registry,abi:registryAbi as Abi,functionName:'getMetadata',args:[1n,1n]}) as any;
  const edit=await rpc('eth_sendTransaction',[{from:fork.owner,to:fork.registry,data:encodeFunctionData({abi:registryAbi as Abi,functionName:'updateListing',args:[1n,{...purchasedMetadata,name:'Edited after purchase'}]})}]);
  await client.waitForTransactionReceipt({hash:edit});
  await panel.getByRole('button',{name:'Refresh balance',exact:true}).click();
  await panel.getByRole('link',{name:'View the featured carousel',exact:true}).click();await expect(page.locator('#featured')).toBeInViewport();await expect(page.locator('.adcard:not(.slot)').first()).toContainText('Pondside');await expect(page.locator('.adcard:not(.slot)').first()).toContainText('#AD'); await expect(page.locator('.adcard:not(.slot)').first()).not.toContainText('Edited after purchase'); if(width===390) { await page.locator('.ads').scrollIntoViewIfNeeded(); await page.screenshot({path:'../artifacts/screenshots/featured-390.jpg',type:'jpeg',quality:72}); }
  await page.goto(`#hook/1/${requestId}`);await expect(page.locator('.detail-pills')).toContainText('#AD');
  await page.goto('#mine');await panel.getByRole('button',{name:'Boost',exact:true}).click();await panel.getByLabel('Boost amount (IMD)').fill('0.02');
  await expect(panel.getByRole('button',{name:'Confirm boost',exact:true})).toBeDisabled();await panel.getByLabel('I confirm this boost is non-refundable.').check();
  await panel.getByRole('button',{name:'Confirm boost',exact:true}).click();await expect(panel.locator('.promotion-row')).toContainText('0.12 IMD total',{timeout:20000});
  await panel.getByRole('button',{name:'Cancel placement',exact:true}).click();await expect(panel).toContainText('All boosts are forfeited');
  await panel.getByRole('button',{name:'Confirm cancellation',exact:true}).click();await expect(panel.locator('.promotion-row')).toHaveCount(0,{timeout:15000});
  await expect(panel.getByRole('button',{name:'Withdraw available balance',exact:true})).toBeEnabled();await panel.getByRole('button',{name:'Withdraw available balance',exact:true}).click();await expect(panel).toContainText('0 IMD',{timeout:15000});
  await expect(panel.locator('[role="alert"]')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  fs.mkdirSync('../artifacts/screenshots',{recursive:true});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:`../artifacts/screenshots/promotions-${width}.jpg`,type:'jpeg',quality:75});expect(errors).toEqual([]);
});
