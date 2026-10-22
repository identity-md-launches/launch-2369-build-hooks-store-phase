import {chromium} from '../web/node_modules/playwright/index.mjs';
import {serve} from './serve.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import site from '../public/site-config.json' with {type:'json'};
const server=await serve(),browser=await chromium.launch({headless:true});
const base=`http://127.0.0.1:${server.address().port}/preview/`;const result={pageErrors:[],geometry:[],firstScreen:null};
try{
 const page=await browser.newPage();page.on('pageerror',e=>result.pageErrors.push(e.message));
 await page.route('**/site-config.json',r=>r.fulfill({json:{...site,relayUrl:null,ads:{}}}));
 await page.route('https://api.imd.fun/**',r=>r.fulfill({status:503}));await page.route('https://raw.githubusercontent.com/**',r=>r.abort());
 for(const c of site.chains)await page.route(c.rpcUrl,async r=>{const q=r.request().postDataJSON();const answer=x=>({jsonrpc:'2.0',id:x.id,result:x.method==='eth_chainId'?`0x${c.id.toString(16)}`:x.method==='eth_getLogs'?[]:'0x0'});await r.fulfill({json:Array.isArray(q)?q.map(answer):answer(q)});});
 await mkdir(new URL('../artifacts/screenshots/',import.meta.url),{recursive:true});
 await page.setViewportSize({width:390,height:844});await page.goto(base+'#store');await page.locator('.prompt .btn').waitFor();await page.evaluate(async()=>{await document.fonts.load('500 18px \"Pixelify Sans\"');await document.fonts.load('400 13px \"Press Start 2P\"');await document.fonts.ready;});
 result.firstScreen=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,primary:document.querySelector('.prompt .btn').getBoundingClientRect().toJSON(),fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family)}));
 assert.ok(result.firstScreen.primary.bottom<=844);assert.equal(result.firstScreen.documentWidth,390);
 await page.screenshot({path:new URL('../artifacts/screenshots/store-390.jpg',import.meta.url).pathname,type:'jpeg',quality:72});
 for(const [width,height]of [[1440,900],[2560,1300],[390,844],[320,900]]){
  await page.setViewportSize({width,height});await page.goto(base+'#store');await page.evaluate(()=>localStorage.clear());await page.goto(base+'#builder');await page.reload();
  const load=await page.locator('.hc-scroll').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight}));
  if(width>=1100){await page.evaluate(()=>scrollTo(0,1000));await page.locator('#s-owner').fill('0x6cba4751742f6989fa224b2dc5d5d52fcef98a34');}
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const measured=await page.evaluate(()=>{const s=document.querySelector('.hc-scroll'),c=document.querySelector('.hookcard').getBoundingClientRect();return{details:s.clientHeight,content:s.scrollHeight,cardTop:c.top,cardBottom:c.bottom,documentWidth:document.documentElement.scrollWidth};});
  assert.equal(measured.documentWidth,width);
  if(width>=1100){assert.ok(measured.details>=load.height&&measured.details>=300);assert.ok(measured.cardTop>=0&&measured.cardBottom<=height+1);}else assert.ok(measured.details+1>=Math.min(measured.content,height*.4));
  result.geometry.push({width,height,load,...measured});
  if(width===1440||width===390)await page.screenshot({path:new URL(`../artifacts/screenshots/builder-${width}.jpg`,import.meta.url).pathname,type:'jpeg',quality:72});
 }
 assert.deepEqual(result.pageErrors,[]);result.passed=true;
}finally{await browser.close();await new Promise(r=>server.close(r));await writeFile(new URL('../artifacts/browser-geometry.json',import.meta.url),JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify(result));
