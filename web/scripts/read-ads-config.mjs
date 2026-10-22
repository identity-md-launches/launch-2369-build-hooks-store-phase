// Public contract reads only. No wallet, signer or transaction methods.
import fs from 'node:fs';
import site from '../../public/site-config.json' with {type:'json'};
import {publicClients} from '../src/chain/clients.ts';
import {adsConfig,placementsAbi} from '../src/chain/ads.ts';
const clients=publicClients(site),rows=[];
for(const chain of site.chains){
 const config=adsConfig(site,chain.id);if(!config)continue;
 try{
  const client=clients[chain.id];const [registryCode,placementCode,registry,imd,recipient,count]=await Promise.all([
   client.getCode({address:config.registry}),client.getCode({address:config.placements}),
   ...['registry','imd','proceedsRecipient','placementCount'].map(functionName=>client.readContract({address:config.placements,abi:placementsAbi,functionName})),
  ]);
  rows.push({chainId:chain.id,registryHasCode:!!registryCode&&registryCode!=='0x',placementsHaveCode:!!placementCode&&placementCode!=='0x',registryMatchesConfig:String(registry).toLowerCase()===config.registry.toLowerCase(),imdConfigured:String(imd).toLowerCase()===chain.imdAddress.toLowerCase(),proceedsRecipientConfigured:BigInt(recipient)!==0n,placementCount:String(count)});
 }catch(e){rows.push({chainId:chain.id,readFailed:true,reason:String(e).slice(0,200)});}
}
const result={observedAt:new Date().toISOString(),readOnly:true,chains:rows,limitation:'Contract setup is read live. An unset IMD or proceeds recipient disables deposit and purchase; only the contract owner can configure them. This task never changes live chain state. Payment validation uses an isolated local fork.'};
fs.mkdirSync(new URL('../../artifacts/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../../artifacts/live-ads-read.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
