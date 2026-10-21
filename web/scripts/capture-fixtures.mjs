// Read-only fixture capture. Never submitted as catalog data.
import { createPublicClient, http, decodeEventLog } from 'viem';
import abi from '../../src/abi/intake.json' with { type: 'json' };
import { writeFile, mkdir } from 'node:fs/promises';
const address = '0xa43e6f75ee006411f79ac1c84120606c2330de82';
const requested = '0x1c521a43c9b0f72a335bc80a6918abce08af7949ebbd1c41fe2a576074379063';
const completed = '0xd4ad2d2ef4e8ea9995103f34e322dbefb2534f3a52984a308f7db8e257b76fa1';
const action = '0x6c61756e63682e6f70656e406c61756e63682d31000000000000000000000000';
const hex = n => '0x' + n.toString(16);
await mkdir('tests/fixtures/chain', { recursive: true });
await Promise.all([[1,'https://ethereum-rpc.publicnode.com'],[4663,'https://rpc.mainnet.chain.robinhood.com']].map(async ([chainId,url]) => {
  const client = createPublicClient({ transport: http(url, { timeout: 20000, retryCount: 1 }) });
  if (await client.getChainId() !== chainId) throw Error('Wrong chain');
  const head = await client.getBlockNumber(), found = { Requested: [], Completed: [] };
  for (let to = head, ranges = 0; to > 0n && ranges < 150; to -= 10000n, ranges++) {
    const from = to >= 9999n ? to - 9999n : 0n;
    const requestLogs = await client.request({ method: 'eth_getLogs', params: [{address, fromBlock:hex(from),toBlock:hex(to),topics:[requested,null,null,action]}] });
    const completeLogs = await client.request({ method: 'eth_getLogs', params: [{address,fromBlock:hex(from),toBlock:hex(to),topics:[completed]}] });
    found.Requested.push(...requestLogs); found.Completed.push(...completeLogs);
    console.log(chainId, 'range', String(from), String(to), 'requests', found.Requested.length, 'completions', found.Completed.length);
    if (found.Requested.length >= 2 && found.Completed.length >= 2) break;
  }
  await writeFile(`test/scratch/all-logs-${chainId}.json`, JSON.stringify(found, null, 2));
  const logs = [...found.Requested.slice(-2), ...found.Completed.slice(-2)];
  const blocks = {};
  for (const log of logs) { const block = await client.getBlock({ blockNumber:BigInt(log.blockNumber) }); blocks[log.blockNumber] = {hash:block.hash, timestamp:String(block.timestamp)}; }
  const fixture = { chainId, rpc:url, capturedAt:new Date().toISOString(), head:String(head), blocks, logs };
  await writeFile(`tests/fixtures/chain/${chainId}-intake.json`, JSON.stringify(fixture,null,2)+'\n');
  for (const log of found.Completed.slice(-20)) {
    const {args} = decodeEventLog({abi,...log});
    console.log(chainId, 'Completed', args.requestId, args.status, args.uri || args.resultHash);
    if (args.status === 0 && args.uri?.startsWith('ipfs://')) {
      const resultUrl='https://ipfs.imd.fun/ipfs/'+args.uri.slice(7);
      try {
        const res=await fetch(resultUrl,{signal:AbortSignal.timeout(20000)});
        if(res.ok) {
          const result=await res.json();
          await writeFile(`test/scratch/result-${chainId}-${args.requestId.slice(2,10)}.json`,JSON.stringify({source:{chainId,requestId:args.requestId,url:resultUrl},result},null,2));
          console.log(chainId,'result fields',Object.keys(result));
        }
      } catch(e){ console.log('Result unavailable',e.message); }
    }
  }
}));
