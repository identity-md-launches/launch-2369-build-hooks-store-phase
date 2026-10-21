// All mutations are guarded to a loopback Anvil fork; no private key or live payment.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createPublicClient,createWalletClient,defineChain,http,custom,erc20Abi,encodeAbiParameters,keccak256,toHex,hexToString} from 'viem';
import site from '../../public/site-config.json' with {type:'json'};
import {newDraft,addBlock,body} from '../../src/lib/compose.ts';
import {launchBody,approveLaunch,requestLaunch,requestedId} from '../src/chain/launch.ts';
import {intakeAbi} from '../src/chain/decode.ts';
const url=process.env.HOOKS_LAUNCH_FORK_URL??'http://127.0.0.1:8546';
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname))throw Error('Refusing mutations outside loopback Anvil');
const chain=defineChain({id:4663,name:'Robinhood Chain fork',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:{default:{http:[url]}}});
const client=createPublicClient({chain,transport:http(url)});
assert.match(await client.request({method:'web3_clientVersion'}),/anvil/i);assert.equal(await client.getChainId(),4663);
const fork=await client.request({method:'anvil_nodeInfo'});assert.ok(fork.forkConfig?.forkUrl?.includes('rpc.mainnet.chain.robinhood.com'),'Must be a Robinhood mainnet fork');
const payer='0x6cba4751742f6989fa224b2dc5d5d52fcef98a34', imd=site.chains.find(c=>c.id===4663).imdAddress;
assert.equal(await client.readContract({address:imd,abi:erc20Abi,functionName:'symbol'}),'IMD');
assert.notEqual(await client.getCode({address:site.intake.address}),'0x');
await client.request({method:'anvil_impersonateAccount',params:[payer]});
await client.request({method:'anvil_setBalance',params:[payer,toHex(10n**20n)]});
// IMD's observed balance mapping is slot 5; verify the override via balanceOf before spending locally.
const slot=keccak256(encodeAbiParameters([{type:'address'},{type:'uint256'}],[payer,5n]));
await client.request({method:'anvil_setStorageAt',params:[imd,slot,toHex(10n**19n,{size:32})]});
assert.equal(await client.readContract({address:imd,abi:erc20Abi,functionName:'balanceOf',args:[payer]}),10n**19n);
const wallet=createWalletClient({chain,account:payer,transport:custom({request:async req=>req.method==='eth_accounts'||req.method==='eth_requestAccounts'?[payer]:client.request(req)})}), config={...site,inProgress:false}, results=[];
for(const type of ['A','B']){
 let draft=newDraft();draft.type=type;draft.settings={...draft.settings,chain:1,pool:50,hname:'ForkPoolGuard'};draft=addBlock(draft,'pause');
 const preview=JSON.stringify(body(draft,payer)),prepared=launchBody(draft,config,payer);
 assert.equal(prepared.json,preview);assert.equal(hexToString(prepared.bytes),preview);
 const ctx={config,chainId:4663,account:payer,client,wallet,bytes:prepared.bytes};
 const approval=await approveLaunch(ctx),approvalReceipt=await client.waitForTransactionReceipt({hash:approval.hash});assert.equal(approvalReceipt.status,'success');
 assert.equal(await client.readContract({address:imd,abi:erc20Abi,functionName:'allowance',args:[payer,site.intake.address]}),approval.price);
 const hash=await requestLaunch(ctx,approval.price),receipt=await client.waitForTransactionReceipt({hash});
 const requestId=requestedId(receipt,ctx,approval.price);
 const tx=await client.getTransaction({hash});
 const {decodeFunctionData}=await import('viem');const decoded=decodeFunctionData({abi:intakeAbi,data:tx.input});
 assert.equal(decoded.functionName,'request');assert.equal(decoded.args[1],prepared.bytes);assert.equal(hexToString(decoded.args[1]),preview);
 assert.equal(JSON.parse(hexToString(decoded.args[1])).chainId,1);assert.equal(decoded.args[3].toLowerCase(),imd.toLowerCase());assert.equal(decoded.args[4],500000000000000000n);
 assert.equal(BigInt(decoded.args[2].target),0n);assert.equal(decoded.args[2].selector,'0x00000000');
 results.push({type,paymentChain:4663,deployChain:1,approvalHash:approval.hash,requestHash:hash,requestId,bodyBytes:(prepared.bytes.length-2)/2,bodyEqualsPreview:true,receiptStatus:receipt.status});
}
// Give the browser suite an isolated local balance and enough data to connect the same public fixture payer.
await client.request({method:'anvil_setStorageAt',params:[imd,slot,toHex(10n**19n,{size:32})]});
const output={forkBlock:fork.forkConfig.forkBlockNumber,payer,localOnly:true,results};
await fs.mkdir(new URL('../../artifacts/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('../../artifacts/launch-fork-results.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
