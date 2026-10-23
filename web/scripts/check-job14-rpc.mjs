// Read-only validation of the production transport against configured public RPCs.
// Uses curl for the network adapter; never reads credentials or local configuration.
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createPublicClient, toHex } from '../node_modules/viem/_esm/index.js';
import { rpcTransport } from '../src/chain/clients.ts';
const run = promisify(execFile);
const config = JSON.parse(fs.readFileSync(new URL('../../public/site-config.json', import.meta.url)));
const output = new URL('../../artifacts/job14/rpc-scan.json', import.meta.url);
const metrics = new Map();
const nativeFetch = globalThis.fetch;
let logActive = 0, maxLogActive = 0;
globalThis.fetch = async (url, options = {}) => {
  const endpoint = String(url), q = JSON.parse(options.body), metric = metrics.get(endpoint) ?? { endpoint, calls: 0, failedHttpCalls: 0, failedJsonRpcCalls: 0, transportFailures: 0, logCalls: 0, largestLogRange: 0 };
  metrics.set(endpoint, metric); metric.calls++;
  const isLog = q.method === 'eth_getLogs';
  if (isLog) { metric.logCalls++; const f = q.params[0]; metric.largestLogRange = Math.max(metric.largestLogRange, Number(BigInt(f.toBlock) - BigInt(f.fromBlock) + 1n)); maxLogActive = Math.max(maxLogActive, ++logActive); }
  try {
    const { stdout } = await run('curl', ['-sS', '--max-time', '18', endpoint, '-H', 'Content-Type: application/json', '--data', options.body, '-w', '\n%{http_code}'], { maxBuffer: 8 * 1024 * 1024 });
    const split = stdout.lastIndexOf('\n'), status = Number(stdout.slice(split + 1)), body = stdout.slice(0, split);
    if (status < 200 || status >= 300) metric.failedHttpCalls++;
    else { try { if (JSON.parse(body).error) metric.failedJsonRpcCalls++; } catch { metric.failedJsonRpcCalls++; } }
    return new Response(body, { status, headers: { 'content-type': 'application/json' } });
  } catch (error) { metric.transportFailures++; throw error; }
  finally { if (isLog) logActive--; }
};
const report = { observedAt: new Date().toISOString(), mode: process.argv.includes('--probe-endpoints') ? 'endpoint diagnostics and full history' : 'full Intake history through the production fallback on both chains', chains: [], endpoints: [], failedCalls: 0, maxLogCallsInFlight: 0, complete: false };
try {
  for (const chain of config.chains) {
    const detail = { chainId: chain.id, endpoints: [], fullHistory: null };
    for (const url of process.argv.includes('--probe-endpoints') ? chain.rpcUrls : []) {
      const client = createPublicClient({ transport: rpcTransport([url], config.rpcLogRanges, config.rpcLogLookbacks) });
      try {
        const id = await client.getChainId(); if (id !== chain.id) throw new Error('Wrong chain');
        const head = await client.getBlockNumber({cacheTime:0}), size = BigInt(config.rpcLogRanges[url]);
        const from = head-size+1n > BigInt(chain.intakeFromBlock) ? head-size+1n : BigInt(chain.intakeFromBlock);
        const logs = await client.request({method:'eth_getLogs',params:[{address:config.intake.address,fromBlock:toHex(from),toBlock:toHex(head),topics:[null,null,null,config.intake.launchAction]}]});
        detail.endpoints.push({url,success:true,fromBlock:String(from),toBlock:String(head),requestedLogs:logs.length});
      } catch { detail.endpoints.push({url,success:false,limitation:'The configured endpoint did not complete its scan.'}); }
    }
    const client = createPublicClient({transport:rpcTransport(chain.rpcUrls,config.rpcLogRanges,config.rpcLogLookbacks)});
    try {
      const head=await client.getBlockNumber({cacheTime:0});
      const query=topic=>client.request({method:'eth_getLogs',params:[{address:config.intake.address,fromBlock:toHex(chain.intakeFromBlock),toBlock:toHex(head),topics:topic}]});
      const [requests,completions]=await Promise.all([query(['0x1c521a43c9b0f72a335bc80a6918abce08af7949ebbd1c41fe2a576074379063',null,null,config.intake.launchAction]),query(['0xd4ad2d2ef4e8ea9995103f34e322dbefb2534f3a52984a308f7db8e257b76fa1'])]);
      detail.fullHistory={success:true,fromBlock:chain.intakeFromBlock,toBlock:String(head),requestedLogs:requests.length,completedLogs:completions.length};
    } catch { detail.fullHistory={success:false,limitation:'Public endpoints did not finish the full history scan.'}; }
    report.chains.push(detail);
  }
  report.complete=report.chains.every(c=>c.fullHistory.success);
} finally {
  globalThis.fetch=nativeFetch;report.endpoints=[...metrics.values()];report.failedCalls=report.endpoints.reduce((n,e)=>n+e.failedHttpCalls+e.failedJsonRpcCalls+e.transportFailures,0);report.maxLogCallsInFlight=maxLogActive;
  report.quietNetworkTargetMet=report.failedCalls===0&&report.complete;
  fs.mkdirSync(new URL('./',output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({complete:report.complete,failedCalls:report.failedCalls,maxLogCallsInFlight:maxLogActive,quietNetworkTargetMet:report.quietNetworkTargetMet}));
}
