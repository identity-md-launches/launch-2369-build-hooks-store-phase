import { test, expect, type Page } from '@playwright/test';
import { encodeAbiParameters, parseAbiParameters, toHex, toFunctionSelector, decodeFunctionData, hexToString, zeroAddress } from 'viem';
import site from '../../public/site-config.json' with {type:'json'};
import { newDraft, addBlock, type LaunchType } from '../../src/lib/compose';
import { injectedOwner, owner, hook, interceptChains, jsonResult, route ,rpcRoute} from './chain-fixture';
import { intakeAbi } from '../src/chain/decode';

function validDraft(type: LaunchType='A') {
  let d=newDraft(); d.type=type;d.settings={...d.settings,chain:1,pool:50,hname:'LaunchGuard'};d=addBlock(d,'pause');
  if(type==='C')d.settings.token=site.chains.find(c=>c.id===1)!.imdAddress;
  return d;
}
async function prepare(page: Page, options: {type?:LaunchType;price?:bigint;fork?:string;locked?:boolean;initialChain?:string;reject?:boolean;delayReceipt?:boolean}={}) {
  const d=validDraft(options.type), calls:any[]=[];
  await page.addInitScript(d=>localStorage.setItem('hooks-store:draft:v2',JSON.stringify(d)),d);
  if(options.reject){
    await page.addInitScript(({owner,initialChain})=>{
      const listeners:Record<string,Function[]>={};let connected=false,chain=initialChain;
      const provider={on:(e:string,f:Function)=>(listeners[e]??=[]).push(f),removeListener:()=>{},request:async({method,params}:any)=>{
        if(method==='eth_requestAccounts'){connected=true;return[owner];}if(method==='eth_accounts')return connected?[owner]:[];
        if(method==='eth_chainId')return chain;
        if(method==='wallet_switchEthereumChain'){chain=params[0].chainId;listeners.chainChanged?.forEach(f=>f(chain));return null;}
        if(method==='eth_sendTransaction')throw Object.assign(Error('User rejected the request'),{code:4001});
        if(method==='wallet_requestPermissions')throw Object.assign(Error('Unsupported'),{code:4200});
        if(method==='eth_estimateGas')return '0x100000';if(method==='eth_gasPrice')return '0x1';
        throw Object.assign(Error('Unsupported'),{code:4200});
      }};
      const announce=()=>dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'26a04a43-28d9-490b-84f7-bc02ef1be771',name:'Fork Wallet',rdns:'test.hooks.fork',icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'},provider}}));
      addEventListener('eip6963:requestProvider',announce);announce();
    },{owner,initialChain:options.initialChain??'0x1237'});
  }else await injectedOwner(page,owner,options.fork,options.initialChain??'0x1237');
  let head=94468175n;
  if(options.fork){const response=await fetch(options.fork,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_blockNumber',params:[]})});head=BigInt((await response.json()).result);}
  const config={...site,relayUrl:null,inProgress:options.locked??false,chains:site.chains.map(c=>({...c,intakeFromBlock:c.id===4663?Number(head):c.intakeFromBlock}))};
  await page.route('**/site-config.json',r=>r.fulfill({json:config}));
  await page.route('https://api.imd.fun/**',r=>r.fulfill({status:503}));
  await page.route('https://raw.githubusercontent.com/**',r=>r.abort());
  for(const chain of config.chains)await page.route(rpcRoute(chain),async r=>{
    const request=r.request().postDataJSON();calls.push({...request,chain:chain.id});
    if(options.fork && chain.id===4663){
      if(options.delayReceipt&&request.method==='eth_getTransactionReceipt')await new Promise(resolve=>setTimeout(resolve,1200));
      const response=await fetch(options.fork,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)});await r.fulfill({json:await response.json()});return;
    }
    let result:unknown='0x';
    if(request.method==='eth_chainId')result=toHex(chain.id);
    else if(request.method==='eth_blockNumber')result=toHex(chain.id===1?26164897n:head);
    else if(request.method==='eth_getLogs')result=[];
    else if(request.method==='eth_call'){
      const selector=request.params[0].data.slice(0,10);
      if(selector===toFunctionSelector('priceOf(bytes32,address)'))result=encodeAbiParameters(parseAbiParameters('uint256'),[options.price??500000000000000000n]);
      else if(selector===toFunctionSelector('balanceOf(address)'))result=encodeAbiParameters(parseAbiParameters('uint256'),[10n**19n]);
      else if(selector===toFunctionSelector('approve(address,uint256)'))result=encodeAbiParameters(parseAbiParameters('bool'),[true]);
      else return r.fulfill({json:{jsonrpc:'2.0',id:request.id,error:{code:3,message:'execution reverted'}}});
    }
    await r.fulfill({json:{jsonrpc:'2.0',id:request.id,result}});
  });
  await page.goto('./#launch');
  await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  await page.getByRole('button',{name:'Fork Wallet'}).click();
  await expect(page.locator('#connect')).toHaveClass(/address/);
  await page.getByLabel('Pay from').selectOption('4663');
  return calls;
}

test('wrong payment chain keeps approval and launch locked until switching',async({page})=>{
  await prepare(page,{initialChain:'0x1'});
  await expect(page.getByRole('button',{name:'Approve 0.5 IMD'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Launch hook'})).toBeDisabled();
  await page.getByRole('button',{name:'Switch to Robinhood Chain',exact:true}).click();
  await expect(page.getByRole('button',{name:'Approve 0.5 IMD'})).toBeEnabled();
  await expect(page.locator('.launch-steps')).toContainText('Deploy on Ethereum. Pay on Robinhood Chain.');
});

test('zero price refuses approval and offers a read retry',async({page})=>{
  await prepare(page,{price:0n});
  await expect(page.getByRole('alert').filter({hasText:'price is zero'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Approve IMD',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Launch hook'})).toBeDisabled();
  await page.getByRole('button',{name:'Retry price'}).click();
  await expect(page.getByRole('alert').filter({hasText:'price is zero'})).toBeVisible();
});

test('rejected approval signature recovers without unlocking launch',async({page})=>{
  await prepare(page,{reject:true});
  await page.getByRole('button',{name:'Approve 0.5 IMD'}).click();
  await expect(page.getByRole('alert').filter({hasText:'Signature cancelled'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Approve 0.5 IMD'})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Launch hook'})).toBeDisabled();
});

test('in-progress flag keeps live payments locked while review and copy work',async({page})=>{
  await prepare(page,{locked:true});
  await expect(page.getByRole('button',{name:'Approve 0.5 IMD'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Launch hook'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Copy request',exact:true})).toBeEnabled();
  await expect(page.getByText('A refused request still spends the fee.')).toBeVisible();
});

for(const type of ['A','B'] as const)test(`Robinhood Anvil fork pays for type ${type}, gates receipts, parses id and preserves preview bytes`,async({page})=>{
  const fork=process.env.HOOKS_LAUNCH_FORK_URL;test.skip(!fork,'Requires the local fork setup; never uses a public wallet transport.');
  test.setTimeout(90000);
  if(!['127.0.0.1','localhost','[::1]'].includes(new URL(fork!).hostname))throw Error('Only loopback fork URLs are permitted');
  const guard=await fetch(fork!,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'web3_clientVersion',params:[]})});expect((await guard.json()).result).toMatch(/anvil/i);
  await prepare(page,{type,fork,delayReceipt:true});
  await page.getByText('Exact request the swarm receives', {exact:true}).click();
  const preview=await page.getByTestId('launch-json').textContent();
  expect(JSON.parse(preview!).chainId).toBe(1);
  await page.getByRole('button',{name:'Approve 0.5 IMD'}).click();
  await expect(page.getByRole('button',{name:'Launching…'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Launch hook'})).toBeDisabled();
  await expect(page.locator('.launch-steps').getByText('Waiting for a successful receipt…')).toBeVisible();
  await expect(page.getByRole('button',{name:'Approved',exact:true})).toBeVisible({timeout:30000});
  await expect(page.getByRole('button',{name:'Launch hook'})).toBeEnabled();
  await page.getByRole('button',{name:'Launch hook'}).click();
  await expect(page.getByRole('button',{name:'Launching…'})).toBeDisabled();
  await expect(page.locator('.launch-done')).toContainText('The swarm has your request…',{timeout:30000});
  await expect(page.getByRole('link',{name:'Open IMD explorer',exact:true})).toHaveAttribute('href','https://explorer.imd.fun/');
  const pending=await page.evaluate(()=>JSON.parse(localStorage.getItem('hooks-store:pending')!));
  expect(pending).toHaveLength(1);expect(pending[0].chainId).toBe(4663);expect(pending[0].requestId).toMatch(/^0x[\da-f]{64}$/);
  expect(page.url()).toContain(`#hook/4663/${pending[0].requestId}`);
  const response=await fetch(fork!,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_getTransactionByHash',params:[pending[0].txHash]})});
  const tx=(await response.json()).result, decoded=decodeFunctionData({abi:intakeAbi,data:tx.input});
  expect(hexToString(decoded.args![1] as `0x${string}`)).toBe(preview);
  await expect(page.locator('.hook-page .detail-pills')).toContainText('Ethereum');
});

test('type C resolves hook(), shows zero as pending, passes PoolId and prepares a dynamic-fee pool call',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.clock.install();
  const deployer=owner, poolId='0x'+'12'.repeat(32);
  let deployedHook:`0x${string}`=zeroAddress;
  const readCalls:{to:string;data:string}[]=[];
  await interceptChains(page,{result:{...jsonResult,launch:{...jsonResult.launch,hookAddress:undefined,tokenAddress:site.chains.find(c=>c.id===1)!.imdAddress,artifacts:[{role:'other',name:'LaunchGuardDeployer',address:deployer}]}}});
  // Contracts-only deployments are confirmed by the launch record, not the earlier result file.
  const record = { id: jsonResult.launch.id, chainId: 1, status: 'live', artifacts: [{ role: 'other', name: 'LaunchGuardDeployer', address: deployer }] };
  await page.route('**/site-config.json', r => r.fulfill({ json: { ...site, chains: site.chains.map(c => ({ ...c, intakeFromBlock: Number(BigInt(logs.requested.blockNumber)) - 20 })) } }));
  await page.route(`${site.relayUrl}/**`, r => r.fulfill({ json: r.request().url().includes('/launches/') ? record : { id: jsonResult.jobId, nodes: [], state: 'completed', launch: record } }));
  // Seed a genuine composer-shaped C request in the normal cached-read format.
  const {storeLogs}=await import('./chain-fixture');const {body}=await import('../../src/lib/compose');const {stringToHex,encodeEventTopics}=await import('viem');
  const logs=storeLogs(),d=addBlock(validDraft('C'),'lp-fee');
  logs.requested.data=encodeAbiParameters(parseAbiParameters('bytes,address,bytes4,address,uint256'),[stringToHex(JSON.stringify(body(d,owner))),owner,'0x00000000',site.chains[0].imdAddress as `0x${string}`,500000000000000000n]);
  await page.addInitScript(({logs,requestId})=>localStorage.setItem('hooks-store:intake:v2:1',JSON.stringify({version:2,head:String(BigInt(logs.requested.blockNumber)),cursor:'-1',records:{[requestId]:{requested:logs.requested,completed:logs.completed}},completions:{}})),{logs,requestId:String(logs.requested.topics[1])});
  await page.route('https://rpc.mevblocker.io/**',async r=>{
    const req=r.request().postDataJSON();let result:unknown;
    if(req.method==='eth_chainId')result='0x1';else if(req.method==='eth_blockNumber')result=logs.completed.blockNumber;
    else if(req.method==='eth_getBlockByNumber')result={number:req.params[0],hash:logs.requested.blockHash,timestamp:'0x6a500000',transactions:[]};
    else if(req.method==='eth_getLogs'){
      const q=req.params[0],candidates=q.topics[0]===logs.requested.topics[0]?[logs.requested]:[logs.completed];
      result=candidates.filter(l=>BigInt(l.blockNumber)>=BigInt(q.fromBlock)&&BigInt(l.blockNumber)<=BigInt(q.toBlock));
    }
    else if(req.method==='eth_call'){
      const call=req.params[0]; readCalls.push({to:call.to,data:call.data});
      const selector=call.data.slice(0,10);
      if(selector===toFunctionSelector('hook()'))result=encodeAbiParameters(parseAbiParameters('address'),[deployedHook]);
      else if(selector===toFunctionSelector('decimals()'))result=encodeAbiParameters(parseAbiParameters('uint8'),[6]);
      else if(selector===toFunctionSelector('poolManager()'))result=encodeAbiParameters(parseAbiParameters('address'),['0x000000000004444c5dc75cB358380D2e3dE08A90']);
      else if(selector===toFunctionSelector('owner()'))result=encodeAbiParameters(parseAbiParameters('address'),[owner]);
      else if(selector===toFunctionSelector('paused(bytes32)'))result=encodeAbiParameters(parseAbiParameters('bool'),[false]);
      else if(selector===toFunctionSelector('currentLpFee(bytes32)'))result=encodeAbiParameters(parseAbiParameters('uint256'),[3000n]);
      else return r.fulfill({json:{jsonrpc:'2.0',id:req.id,error:{code:3,message:'execution reverted'}}});
    }
    else return r.fulfill({json:{jsonrpc:'2.0',id:req.id,error:{code:3,message:'execution reverted'}}});
    await r.fulfill({json:{jsonrpc:'2.0',id:req.id,result}});
  });
  await page.goto(`./${route}`);
  await expect(page.locator('.hook-page .notice').filter({hasText:'hook not deployed yet'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Open the pool',exact:true})).toHaveCount(0);
  expect(readCalls.some(call=>call.to.toLowerCase()===deployer.toLowerCase()&&call.data===toFunctionSelector('hook()'))).toBe(true);
  await page.goto(`./#mine?address=${owner}`);
  await expect(page.locator('.mine-row')).toContainText('hook not deployed yet');
  await expect(page.getByRole('link',{name:'Manage',exact:true})).toHaveCount(0);
  deployedHook=hook;
  await page.goto(`./${route}`); await page.clock.fastForward(20001);
  await expect(page.getByRole('heading',{name:'Open the pool',exact:true})).toBeVisible();
  await expect(page.locator('.pool-panel')).toContainText('Dynamic fee flag (0x800000)');
  await page.getByLabel('Pool id for these controls',{exact:true}).fill(poolId);
  await expect.poll(()=>readCalls.filter(call=>call.data.startsWith(toFunctionSelector('paused(bytes32)'))).length).toBeGreaterThan(0);
  const pausedCall=readCalls.slice().reverse().find(call=>call.data.startsWith(toFunctionSelector('paused(bytes32)')))!;
  expect(pausedCall.to.toLowerCase()).toBe(hook);
  expect(pausedCall.data.slice(10)).toBe(poolId.slice(2));
  await page.getByLabel('Starting price').fill('0.000001');
  await expect(page.getByTestId('sqrt-price')).toHaveText(((1n<<96n)/1000n).toString());
  await expect(page.getByRole('button',{name:'Copy initialize call'})).toBeEnabled();
  const initialize=JSON.parse((await page.getByTestId('pool-call').textContent())!);
  expect(initialize.poolKey.hooks.toLowerCase()).toBe(hook);
  expect(initialize.poolKey.fee).toBe(0x800000);
  await expect(page.locator('.pool-panel button').filter({hasText:/send|initialize pool/i})).toHaveCount(0);
  await page.getByLabel('Starting price').fill('0');
  await expect(page.getByRole('button',{name:'Copy initialize call'})).toBeDisabled();
  await expect(page.locator('#pool-price-error')).toHaveText('The starting price must be above zero.');
});

test('a refresh recovers the approval receipt without another payment or approval',async({page})=>{
  const fork=process.env.HOOKS_LAUNCH_FORK_URL;test.skip(!fork,'Requires the guarded local fork.');test.setTimeout(90000);
  const rpc=async(method:string,params:unknown[])=>{const r=await fetch(fork!,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});return(await r.json()).result;};
  expect(new URL(fork!).hostname).toBe('127.0.0.1');expect(await rpc('web3_clientVersion',[])).toMatch(/anvil/i);
  await prepare(page,{fork});await page.getByRole('button',{name:'Approve 0.5 IMD'}).click();await expect(page.getByRole('button',{name:'Approved',exact:true})).toBeVisible({timeout:30000});
  const nonce=await rpc('eth_getTransactionCount',[owner,'latest']);
  await page.reload();await page.getByRole('button',{name:'Connect wallet',exact:true}).click();await page.getByRole('button',{name:'Fork Wallet'}).click();if(await page.getByLabel('Pay from').inputValue()!=='4663')await page.getByLabel('Pay from').selectOption('4663');
  await expect(page.getByText('A submitted transaction is saved. Check its confirmation to continue.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Launch hook'})).toBeDisabled();
  await page.getByRole('button',{name:'Check confirmation'}).click();await expect(page.getByRole('button',{name:'Approved',exact:true})).toBeVisible();
  expect(await rpc('eth_getTransactionCount',[owner,'latest'])).toBe(nonce);
  await expect(page.getByRole('button',{name:'Launch hook'})).toBeEnabled();
});

for(const width of [320,390,821,1440])test(`launch review fits ${width}px and keeps the complete summary, fees and wallet steps`,async({page})=>{
  await page.setViewportSize({width,height:900});await prepare(page);
  await expect(page.getByRole('heading',{name:'Review your launch'})).toBeVisible();
  await expect(page.locator('.fee-table')).toContainText('1.25%');
  await expect(page.getByRole('button',{name:'Launch hook'})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.getByText('Exact request the swarm receives',{exact:true}).click();
  await expect(page.getByTestId('launch-json')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.getByText('Exact request the swarm receives',{exact:true}).click();
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
  if(width!==821)await page.screenshot({path:`../artifacts/launch-${width}.png`,fullPage:true});
});

test('Copy request copies the exact compact preview JSON',async({page,browserName})=>{
  test.skip(browserName!=='chromium','System clipboard permission is checked in Chromium.');
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);await prepare(page);
  await page.getByText('Exact request the swarm receives',{exact:true}).click();const preview=await page.getByTestId('launch-json').textContent();
  await page.getByRole('button',{name:'Copy request',exact:true}).click();
  await expect(page.getByText('Request copied.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(preview);
});
