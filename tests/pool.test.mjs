import test from 'node:test';
import assert from 'node:assert/strict';
import { integerSqrt, sqrtPriceX96, poolCall } from '../web/src/chain/pool.ts';
import { decodeFunctionData } from '../web/node_modules/viem/_esm/index.js';
import { initializeAbi } from '../web/src/chain/pool.ts';
const token='0x8e7c7936b4f2d4475dc4bacd174dc228d4d24e86', hook='0x82f636a92364d13754d7b3e72d460f0be20a28cc';
test('integer square root rounds down exactly, including large integers',()=>{
 for(const n of [0n,1n,2n,3n,4n,10n,10n**100n+123n]){const x=integerSqrt(n);assert.ok(x*x<=n);assert.ok((x+1n)*(x+1n)>n);}
});
test('price is inverted for sorted ETH/token and adjusted for token decimals',()=>{
 const Q96=1n<<96n;
 assert.equal(sqrtPriceX96('1',18),Q96);
 assert.equal(sqrtPriceX96('0.25',18),2n*Q96);
 assert.equal(sqrtPriceX96('4',18),Q96/2n);
 assert.equal(sqrtPriceX96('1',6),Q96/1000000n);
 assert.equal(sqrtPriceX96('0.000001',6),Q96/1000n);
 assert.equal(sqrtPriceX96('1.0000',18),Q96);
 // An irrational sqrt is exact to the last integer, without floating point.
 const x=sqrtPriceX96('0.003',18), n=(1000n*(1n<<192n))/3n;
 assert.ok(x*x<=n && (x+1n)*(x+1n)>n);
});
test('zero, negative, exponent, malformed and unrepresentable prices are refused',()=>{
 for(const p of ['0','-1','1e-3','','.','NaN','0x1','1.2.3','0.'+'0'.repeat(79)+'1'])assert.throws(()=>sqrtPriceX96(p,18));
 assert.throws(()=>sqrtPriceX96('1',-1));assert.throws(()=>sqrtPriceX96('1',256));
});
test('copyable initialize calldata uses live addresses, sorted native ETH, fee tier and matching spacing',()=>{
 for(const [tier,fee,spacing]of [['0.05',500,10],['0.3',3000,60],['1',10000,200]]){
  const call=poolCall(1,token,hook,[{id:'pool-rules',p:{tier}}],'1',18);
  const decoded=decodeFunctionData({abi:initializeAbi,data:call.data});
  assert.equal(decoded.functionName,'initialize');assert.equal(decoded.args[0].fee,fee);assert.equal(decoded.args[0].tickSpacing,spacing);
  assert.equal(BigInt(decoded.args[0].currency0),0n);assert.equal(decoded.args[0].currency1.toLowerCase(),token);
  assert.equal(decoded.args[0].hooks.toLowerCase(),hook);assert.equal(decoded.args[1],1n<<96n);assert.equal(call.value,'0');
 }
 assert.equal(poolCall(4663,token,hook,[],'1',18).poolKey.tickSpacing,60);
});
