# Job 8 — pool allocation verification

Checked 2026-10-21. Scope: SPEC 4.16 item 29. Read-only public API, documentation and chain receipts; no transaction was sent.

## Result

For successful `univ4_hook` launches on both supported chains, `economics.poolBps` is basis points of **the total token supply**, not a percentage of the creator's 90% share. The swarm receives 10% of total supply. The remainder recipient receives what remains after seeding, including the tiny unused seeding-rounding balance. Consequently, 8000 means approximately 80% pool / 10% remainder / 10% swarm; it does not mean 72% pool / 18% remainder / 10% swarm.

This conclusion comes from the API's recorded launch economics and the token's actual `Transfer` events in each successful deployment transaction. It does not depend on the free check interpreting prose correctly.

## Robinhood Chain: launch 2418

[Primary launch record](https://api.imd.fun/launches/5992ada2-68e1-4af2-ad6d-47d67e09f703), kind `univ4_hook`, chain 4663, records `economics.poolBps: 8000` and remainder recipient `0x755aee18b71697b9c6dab6d3f0f05c63b58caa92`.

[Successful deployment transaction](https://robin.etherscan.io/tx/0xf6750d8919c43192add6432b7a68f395273563c6fb25c358a089280370aeeccd), block **94601188**, status **1**. Token: `0xecb5e7f3b9839eb083dda95099b8438ecebec16e`; factory: `0xa25b02a1e93903b790e6aaf7da1b8b8d50294645`.

The token's Transfer events, in raw 18-decimal units:

| Event | Recipient | Amount |
| --- | --- | ---: |
| Mint to factory | Factory above | 1000000000000000000000000000 |
| Factory to distributor | `0x23d9d1e70ebae1e0b8749567c5229cf6a7381474` | 100000000000000000000000000 |
| Factory to PoolManager | `0x8366a39cc670b4001a1121b8f6a443a643e40951` | 799999999999999999999999465 |
| Factory to remainder recipient | Recipient above | 100000000000000000000000535 |

The pool receives 800,000,000 tokens minus 535 raw units; the remainder receives 100,000,000 tokens plus those 535 units. The primary launch record's objective independently describes the 80/10/10 allocation.

## Ethereum: launch 2406

[Primary launch record](https://api.imd.fun/launches/88bb3e90-e0c0-4753-b17c-242f5482a395), kind `univ4_hook`, chain 1, records `economics.poolBps: 8800`.

[Successful deployment transaction](https://etherscan.io/tx/0x5b7d7a3c680ecbcab529ef7d3958e1c88ecda33df2577e83fd6f01ee470f4636), block **26242898**, status **1**. Token: `0x3b9ea137b38034e49579a038cda4f9e033b2eeba`; factory: `0x12c63b581d07093f6126bc02263c58f7eadaa96f`.

The token's Transfer events, in raw 18-decimal units:

| Event | Recipient | Amount |
| --- | --- | ---: |
| Mint to factory | Factory above | 1000000000000000000000000000 |
| Factory to distributor | `0x1744cb1452019c5b1e5bf05d44df6cdd7c2ec853` | 100000000000000000000000000 |
| Factory to PoolManager | `0x000000000004444c5dc75cb358380d2e3de08a90` | 879999999999999999999999658 |
| Factory to remainder recipient | `0x2f8cb181d0d292c5812631cc07ed6f1e90e0b385` | 20000000000000000000000342 |

This is 88% pool / 2% remainder / 10% swarm, with 342 raw units of unused seeding balance returned to the remainder recipient.

## Documentation discrepancy and limits

The [official IMD documentation](https://imd.fun/docs/#launch-fields) agrees in its Supply entry that poolBps applies to total supply. Its economics table and hook example also contain conflicting prose describing a fraction of the requester's ninety percent. Those prose statements cannot both describe the observed receipts. The chain evidence above resolves the implemented behavior for the two current factories; future factory or policy changes should be checked again.

Receipts were read with `eth_getTransactionReceipt` using the machine's assigned provider for each chain. Public source endpoints: [Robinhood Chain RPC](https://rpc.mainnet.chain.robinhood.com) and [Ethereum RPC](https://rpc.mevblocker.io). Only the named transactions were read. Factory source was not fetched or audited; this checks observed successful allocations, not every possible input or future deployment.
