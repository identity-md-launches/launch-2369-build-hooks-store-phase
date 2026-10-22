// Isolated local Anvil fork only. Never signs or sends a transaction to a public RPC.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createPublicClient, createWalletClient, defineChain, http, custom, erc20Abi, toHex, keccak256, encodeAbiParameters } from 'viem';
import config from '../../public/site-config.json' with { type:'json' };
import { registryAbi, placementsAbi, readAds, depositFor, sendAdTransaction, AD_PRICE } from '../src/chain/ads.ts';
const root=fileURLToPath(new URL('../../',import.meta.url));
const scratch=path.join(root,'test/scratch');fs.mkdirSync(scratch,{recursive:true});
const compiled=path.join(scratch,'ads-compiled');
execFileSync('forge',['build','--root',path.join(root,'tests/fixtures/ads'),'--contracts','src','--out',compiled,'--cache-path',path.join(scratch,'ads-cache'),'--use','0.8.26','--optimize','--optimizer-runs','200','--evm-version','cancun','--no-metadata'],{stdio:'pipe'});
if(process.argv.includes('--with-browser')) {
 execFileSync(path.join(root,'web/node_modules/.bin/playwright'),['test','job10-promotions.spec.ts','--config',path.join(root,'web/playwright.config.ts'),'--reporter=list'],{cwd:path.join(root,'web'),stdio:'inherit',timeout:300000});process.exit(0);
}
const rpc='http://127.0.0.1:8557';
const anvil=spawn('anvil',['--port','8557','--fork-url',config.chains.find(c=>c.id===4663).rpcUrls[0],'--chain-id','4663','--no-storage-caching','--silent'],{stdio:'ignore'});
const chain=defineChain({id:4663,name:'Robinhood local fork',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:{default:{http:[rpc]}}});
const client=createPublicClient({chain,transport:http(rpc,{retryCount:0,timeout:12000})});
const owner='0x6cba4751742f6989fa224b2dc5d5d52fcef98a34', second='0x9a50fd22bcefd3774d796e775a467a7f743e0ab0', imd=config.chains.find(c=>c.id===4663).imdAddress;
const result={localOnly:true,fork:'Robinhood Chain',contractsFromCommit:'952e62de284440144a24fc4ec4868461e4534612',checks:[]};
try{
 let connected=false;
 for(let i=0;i<40;i++){try{await client.getChainId();connected=true;break;}catch{await new Promise(r=>setTimeout(r,250));}}
 assert.ok(connected,'Local Anvil fork did not start');
 assert.match(await client.request({method:'web3_clientVersion'}),/anvil/i);
 assert.equal(await client.readContract({address:imd,abi:erc20Abi,functionName:'symbol'}),'IMD');
 for(const account of [owner,second]){
  await client.request({method:'anvil_impersonateAccount',params:[account]});await client.request({method:'anvil_setBalance',params:[account,toHex(10n**20n)]});
  const slot=keccak256(encodeAbiParameters([{type:'address'},{type:'uint256'}],[account,5n]));await client.request({method:'anvil_setStorageAt',params:[imd,slot,toHex(10n**19n,{size:32})]});
  assert.equal(await client.readContract({address:imd,abi:erc20Abi,functionName:'balanceOf',args:[account]}),10n**19n);
 }
 const walletFor=account=>createWalletClient({chain,account,transport:custom({request: req=>['eth_accounts','eth_requestAccounts'].includes(req.method)?Promise.resolve([account]):client.request(req)})});
 const wallet=walletFor(owner),wallet2=walletFor(second);
 const deploy=async(name,args=[])=>{const artifact=JSON.parse(fs.readFileSync(path.join(compiled,`${name}.sol/${name}.json`)));const hash=await wallet.deployContract({abi:artifact.abi,bytecode:artifact.bytecode.object,args});const r=await client.waitForTransactionReceipt({hash});assert.equal(r.status,'success');return r.contractAddress;};
 const registry=await deploy('HookListingRegistry'),placements=await deploy('FeaturedPlacementsV2',[owner,registry]);
 const ctx={client,wallet,account:owner,chainId:4663,config:{registry,placements},imd}, ctx2={...ctx,wallet:wallet2,account:second};
 await sendAdTransaction(ctx,placements,placementsAbi,'configureToken',[imd]);await sendAdTransaction(ctx,placements,placementsAbi,'setProceedsRecipient',[owner]);
 const browserStart = await client.request({method:'evm_snapshot',params:[]});
 const hook='0x5a9e7a61c45d2c615162fa57931bcbc06d9b20cc';assert.notEqual(await client.getCode({address:hook}),'0x');
 const metadata={name:'Pinned original',sourceRef:'https://github.com/identity-md-launches/launch-2448-launch-test-test-uniswap',testRef:'',reviewRef:'',auditRef:'',callbackMask:BigInt(hook)&0x3fffn,callbackDisclosure:'beforeInitialize, beforeSwap, afterSwap',feeDisclosure:'1% in IMD',adminDisclosure:'Owner may pause swaps',labels:['swap-fee']};
 await sendAdTransaction(ctx,registry,registryAbi,'createListing',[4663n,hook,metadata]);result.checks.push('createListing');
 await depositFor(ctx,AD_PRICE);assert.equal(await client.readContract({address:placements,abi:placementsAbi,functionName:'available',args:[owner]}),AD_PRICE);result.checks.push('approve and deposit real fork IMD');
 const now=(await client.getBlock()).timestamp;
 await sendAdTransaction(ctx,placements,placementsAbi,'purchase',[1n,1n,owner,now+600n]);result.checks.push('purchase');
 await sendAdTransaction(ctx,registry,registryAbi,'updateListing',[1n,{...metadata,name:'Edited later'}]);
 let ads=await readAds(client,4663,{registry,placements});assert.equal(ads[0].metadata.name,'Pinned original');assert.equal(ads[0].placement.revision,1n);result.checks.push('carousel retains purchased revision after edit');
 await depositFor(ctx2,AD_PRICE);await sendAdTransaction(ctx2,placements,placementsAbi,'boost',[1n,AD_PRICE]);assert.equal(await client.readContract({address:placements,abi:placementsAbi,functionName:'rankOf',args:[1n]}),AD_PRICE*2n);result.checks.push('second wallet deposit and boost');
 await client.request({method:'evm_increaseTime',params:[3600]});await client.request({method:'evm_mine',params:[]});
 const r=await sendAdTransaction(ctx,placements,placementsAbi,'cancel',[1n]);
 const p=await client.readContract({address:placements,abi:placementsAbi,functionName:'getPlacement',args:[1n]});
 const expected=AD_PRICE-AD_PRICE*(p.closedAt-p.startsAt)/(p.endsAt-p.startsAt);
 assert.equal(p.refund,expected);assert.equal(await client.readContract({address:placements,abi:placementsAbi,functionName:'available',args:[owner]}),expected);
 assert.equal(await client.readContract({address:placements,abi:placementsAbi,functionName:'proceeds',args:[owner]}),AD_PRICE*2n-expected);
 assert.equal((await readAds(client,4663,{registry,placements})).length,0);result.checks.push('cancel removes ad and refunds only pro-rata base; boosts forfeited');
 const before=await client.readContract({address:imd,abi:erc20Abi,functionName:'balanceOf',args:[owner]});await sendAdTransaction(ctx,placements,placementsAbi,'withdraw',[expected,owner]);assert.equal(await client.readContract({address:imd,abi:erc20Abi,functionName:'balanceOf',args:[owner]}),before+expected);result.checks.push('withdraw available balance');
 await client.request({method:'evm_revert',params:[browserStart]});
 // Browser tests create their own listings on this same isolated fork, never on the live chain.
 fs.writeFileSync(path.join(scratch,'ads-fork.json'),JSON.stringify({rpc,registry,placements,owner,imd,hook,block:Number(await client.getBlockNumber())}));
 if(process.argv.includes('--serve-browser')) { console.log('ADS_FORK_READY'); await new Promise(resolve=>process.once('SIGTERM',resolve)); }
 result.passed=true;
}catch(error){result.passed=false;result.error=String(error).slice(0,600);throw error;}
finally{fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/ads-fork-results.json'),JSON.stringify(result,null,2)+'\n');anvil.kill('SIGTERM');}
console.log(JSON.stringify(result,null,2));
