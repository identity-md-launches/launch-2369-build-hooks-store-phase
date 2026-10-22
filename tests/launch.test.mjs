import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedPrice, launchBody, approveLaunch, requestLaunch, launchError } from '../web/src/chain/launch.ts';
import { body, addBlock, newDraft } from '../src/lib/compose.ts';
import config from '../public/site-config.json' with {type:'json'};
import { hexToString } from '../web/node_modules/viem/_esm/index.js';
import { checkRequest } from '../web/src/relay.ts';
const account='0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
const site={...config,inProgress:false};
test('reported unsafe composed drafts are refused by the production serializer and free-check client', async () => {
 for (const text of ['Every swap fee must be paid in ETH.', 'Send swap fees to Bob.', `Use Chainlink VRF to draw the pot and pay the winner at ${account}.`, 'Use the USDC/ETH pool for pricing.']) {
  const d=newDraft();d.settings={...d.settings,chain:1,pool:50,rem:account};d.blocks.push({id:'custom',p:{text}});
  assert.throws(()=>launchBody(d,site,account), error=>error.message.includes(text));
  // A loopback URL is deliberately unreachable: the local guard must reject before fetch.
  await assert.rejects(checkRequest('http://127.0.0.1:1',body(d,account)), error=>error.message.includes(text));
 }
});
function draft(type='A'){let d=newDraft();d.type=type;d.settings={...d.settings,chain:1,pool:50,hname:'PondGuard'};d=addBlock(d,'pause');return d;}
function ctx(overrides={}){return {config:site,chainId:4663,account,bytes:launchBody(draft(),site,account).bytes,client:{getChainId:async()=>4663,readContract:async({functionName})=>functionName==='priceOf'?500000000000000000n:1000000000000000000n,simulateContract:async()=>({request:{}})},wallet:{getChainId:async()=>4663,getAddresses:async()=>[account],writeContract:async()=>{throw Object.assign(new Error('User rejected the request'),{code:4001});}},...overrides};}
test('the preview is the exact compact UTF-8 JSON used in a cross-chain A/B/C request',()=>{
 for(const type of ['A','B','C']){const d=draft(type);if(type==='C')d.settings.token=config.chains[0].imdAddress;
  const prepared=launchBody(d,site,account);assert.equal(prepared.json,JSON.stringify(body(d,account)));assert.equal(hexToString(prepared.bytes),prepared.json);assert.equal(JSON.parse(prepared.json).chainId,1);
 }
});
test('only enabled deploy chains and complete, size-limited drafts reach the payment flow',()=>{
 assert.throws(()=>launchBody(draft(),{...site,enabledDeployChains:[4663]},account),/enabled deploy chain/);
 const d=draft();d.settings.chain=null;assert.throws(()=>launchBody(d,site,account),/Choose a deploy chain/);
 d.settings.chain=1;d.prompt='x'.repeat(4000);assert.throws(()=>launchBody(d,site,account),/longer than 3,000/);
});
test('zero and excessive prices are refused; bounded positive prices are exact',()=>{
 assert.throws(()=>checkedPrice(0n),/price is zero/);assert.throws(()=>checkedPrice(500000000000000001n),/exceeds 0.5/);assert.equal(checkedPrice(1n),1n);assert.equal(checkedPrice(500000000000000000n),500000000000000000n);
});
test('wrong chain and changed account refuse before approval or request simulation',async()=>{
 const c=ctx();c.wallet.getChainId=async()=>1;await assert.rejects(approveLaunch(c),/wrong payment chain/);await assert.rejects(requestLaunch(c,1n),/wrong payment chain/);
 c.wallet.getChainId=async()=>4663;c.wallet.getAddresses=async()=>[];await assert.rejects(approveLaunch(c),/wallet changed/);
});
test('zero price prevents a signature and rejection translates to a recoverable message',async()=>{
 const c=ctx();c.client.readContract=async()=>0n;await assert.rejects(approveLaunch(c),/price is zero/);
 await assert.rejects(approveLaunch(ctx()),/User rejected/);assert.match(launchError(new Error('User rejected the request')),/Signature cancelled/);
});
test('changed price, missing allowance, body over 16 KiB and the build banner fail closed',async()=>{
 await assert.rejects(requestLaunch(ctx(),1n),/price changed/);
 const c=ctx();c.client.readContract=async({functionName})=>functionName==='priceOf'?500000000000000000n:0n;await assert.rejects(requestLaunch(c,500000000000000000n),/approval is no longer/);
 await assert.rejects(approveLaunch(ctx({bytes:'0x'+'aa'.repeat(16385)})),/16 KiB/);
 await assert.rejects(approveLaunch(ctx({config:{...config,inProgress:true}})),/banner goes away/);
});
test('the final signing guard checks the actual composed bytes again before approving or launching',async()=>{
 const input=body(addBlock(draft(),'swap-fee'),account);input.objective=input.objective.replace('from the IMD (pair currency) side','from the ETH (pair currency) side');
 const {stringToHex}=await import('../web/node_modules/viem/_esm/index.js');
 const c=ctx({bytes:stringToHex(JSON.stringify(input))});let sends=0;c.wallet.writeContract=async()=>{sends++;};
 await assert.rejects(approveLaunch(c),/fee side must be IMD/);await assert.rejects(requestLaunch(c,500000000000000000n),/fee side must be IMD/);assert.equal(sends,0);
});

test('approval receipts verify token events for EOAs and Smart Wallets, including replacement guards',async()=>{
 const {verifyApprovalReceipt}=await import('../web/src/chain/launch.ts');
 const {erc20Abi,encodeAbiParameters,encodeEventTopics}=await import('../web/node_modules/viem/_esm/index.js');
 const c=ctx(),price=500000000000000000n,imd=site.chains.find(chain=>chain.id===4663).imdAddress;
 const log={address:imd,topics:encodeEventTopics({abi:erc20Abi,eventName:'Approval',args:{owner:account,spender:site.intake.address}}),data:encodeAbiParameters([{type:'uint256'}],[price])};
 // Receipt outer sender/target deliberately differ: account-abstraction bundlers wrap the call.
 const receipt={status:'success',from:site.intake.address,to:site.intake.address,logs:[log]};
 assert.doesNotThrow(()=>verifyApprovalReceipt(receipt,c,price));
 assert.throws(()=>verifyApprovalReceipt({...receipt,status:'reverted'},c,price),/reverted/);
 assert.throws(()=>verifyApprovalReceipt({...receipt,logs:[]},c,price),/expected IMD approval/);
 assert.throws(()=>verifyApprovalReceipt(receipt,c,price-1n),/expected IMD approval/);
 assert.throws(()=>verifyApprovalReceipt({...receipt,logs:[{...log,address:site.intake.address}]},c,price),/expected IMD approval/);
});
