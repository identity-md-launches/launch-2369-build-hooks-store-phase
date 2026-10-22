import * as C from '../src/lib/compose.ts';
import {checkConsistency} from '../src/lib/safety.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
test('all 1,221 enabled catalog pairs compose cleanly or are refused before payment',()=>{
let raw=0,accepted=0,rejected=0,failures=[];
const owner='0x6cba4751742f6989fa224b2dc5d5d52fcef98a34';
for(const type of ['A','B','C']){
 const defs=C.BLOCKS.filter(b=>!C.TOKEN_IDS.includes(b.id)&&!b.disabled&&b.id!=='custom'&&b.types.includes(type));
 for(let i=0;i<defs.length;i++)for(let j=i+1;j<defs.length;j++){
  raw++;let d={...C.newDraft(),type,mode:'blocks',seeded:true};d.settings={...d.settings,chain:1,pair:'eth',pool:50,hname:'SweepHook',token:owner,owner};
  const include=id=>{if(C.has(d,id))return;const def=C.BY_ID[id];if(def.requires)include(def.requires);if(def.requiresAny&&!def.requiresAny.some(id=>C.has(d,id)))include(def.requiresAny[0]);d=C.addBlock(d,id);};
  include(defs[i].id);include(defs[j].id);
  if(!C.has(d,defs[i].id)||!C.has(d,defs[j].id)){rejected++;continue;}
  for(const b of d.blocks)for(const p of C.BY_ID[b.id].params){if(p.type==='address')b.p[p.k]=owner;if(p.type==='datetime')b.p[p.k]=b.id==='sunset'?'2031-01-01 00:00':'2030-01-01 00:00';}
  if(C.validate(d,owner).length){rejected++;continue;}
  accepted++;const f=checkConsistency(C.body(d,owner));if(f.length)failures.push({type,ids:[defs[i].id,defs[j].id],codes:f.map(f=>f.code),messages:f.map(f=>f.message)});
 }
}
const result={raw,accepted,rejected,failures};
mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});writeFileSync(new URL('../artifacts/pair-sweep.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
assert.equal(raw,1221);assert.ok(accepted>=1014);assert.deepEqual(failures,[]);
});
