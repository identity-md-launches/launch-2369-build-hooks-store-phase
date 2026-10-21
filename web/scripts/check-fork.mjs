// Optional network check. The default unit suite never starts or accesses a fork.
import { createPublicClient, http } from 'viem';
import assert from 'node:assert/strict';
import { resolveOnChain } from '../src/chain/resolve.ts';
const client = createPublicClient({ transport: http('http://127.0.0.1:8545') });
assert.equal(await client.getChainId(), 1, 'Expected an Ethereum mainnet fork');
const hook = await resolveOnChain(client, 1, '0x82f636a92364d13754d7b3e72d460f0be20a28cc');
assert.equal(hook?.kind, 'hook');
assert.equal(hook.poolManager.toLowerCase(), '0x000000000004444c5dc75cb358380d2e3de08a90');
assert.ok(hook.permissions.includes('beforeSwap') && hook.permissions.includes('afterSwap'));
console.log(JSON.stringify(hook));
const token = await resolveOnChain(client, 1, '0x8e7c7936b4f2d4475dc4bacd174dc228d4d24e86');
assert.equal(token?.kind, 'token');
assert.equal(token.symbol, 'HAMSTER');
assert.ok(token.name.toLowerCase().includes('hamster'));
console.log(JSON.stringify(token));
