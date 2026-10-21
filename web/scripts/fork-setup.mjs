// Read known contracts on an isolated Ethereum fork, then deploy the explicit local mock.
import {createPublicClient,http} from 'viem';import fs from 'node:fs/promises';
const client=createPublicClient({transport:http('http://127.0.0.1:8545')});
if(await client.getChainId()!==1)throw Error('Expected Ethereum mainnet fork');
if(!/anvil/i.test(await client.request({method:'web3_clientVersion'})))throw Error('Local setup requires Anvil');
const owner='0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
await client.request({method:'anvil_impersonateAccount',params:[owner]});
await client.request({method:'anvil_setBalance',params:[owner,'0x56bc75e2d63100000']});
const code='0x'+(await fs.readFile('test/scratch/fork/compiled/ControlHook.bin','utf8')).trim();
const hash=await client.request({method:'eth_sendTransaction',params:[{from:owner,data:code,gas:'0x300000'}]});
const receipt=await client.waitForTransactionReceipt({hash});
if(receipt.status!=='success')throw new Error('Mock deploy failed');
await fs.writeFile('test/scratch/fork-state.json',JSON.stringify({owner,hook:receipt.contractAddress,tx:hash,block:String(receipt.blockNumber)},null,2));
console.log('Local mock deployed',receipt.contractAddress,'block',String(receipt.blockNumber));
