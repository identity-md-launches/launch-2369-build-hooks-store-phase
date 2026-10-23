# Job 14 evidence

`pond-logs.json` contains the seven real Requested logs and their four Completed logs, read from the Ethereum Intake through rpc.mevblocker.io on 2026-10-23. Requested block timestamps are retained. It includes the actual UTF-8 objective bytes, payer, request/transaction ids and block hashes. No production fixture is bundled.

The matching public spec evidence was downloaded from `https://raw.githubusercontent.com/the-hook-store/hooks-store-spec/main/evidence/`:

| Test launch | Request prefix | Evidence |
| --- | --- | --- |
| 1, PondsideGuard / 2424 | `0xdff53a4e` | Body and intake fate; live record in snapshot |
| 2, stopped test $TEST | `0x8c7a2972` | Body, intake fate and real blocked job |
| 3, ImdGuard | `0x4208cbe0` | Body, intake fate and real blocked job |
| 4, WordsmithHook | `0x43921ed5` | Body, intake fate and real blocked job |
| 5, test / 2448 | `0xece8c70d` | Body and intake fate; live record in snapshot |
| 6, ReedGuard / 2449 | `0xbe2a3bbe` | Body and intake fate; live record in snapshot |
| 7, LilyGuard / 2450 | `0x17a9c37c` | Body and intake fate; live record in snapshot |

`launch-records.json` is the published version-1 snapshot, generated at 2026-10-23T04:50:51Z. The four real Requested objectives match its SHA-256 values exactly. Payers, deployment chains and kinds also match. The snapshot does not include the three stopped jobs, which never produced a launch; their old chain timestamps alone exclude them during an outage. Separate unit cases cover snapshots carrying parked, failed and running records.

`proven-launches.json` is the public proven index captured for the four PROVEN assertions and the deployer hook-address responses. The browser harness explicitly synthesizes only its young request, timing/error responses and bytecode responses. These controlled answers exercise state transitions; they do not claim to be deployment evidence. The blocked job JSON files and chain logs are unmodified captured data.
