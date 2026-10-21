# The Hooks Store relay

`worker.js` is a self-contained Cloudflare module Worker. It needs no secrets, KV, database, account id in source, or wallet credentials. The operator deploys it from their authenticated Cloudflare account; this assignment does not deploy it.

From the repository root, one command:

```sh
npx wrangler deploy relay/worker.js --name hooks-store-relay --compatibility-date 2026-10-21
```

Set `relayUrl` in `public/site-config.json` to the resulting **HTTPS Worker URL**, without a trailing path, then rebuild the site (`npm --prefix web run build`). It is `null` by default. Keep `inProgress: true` until the owner has read the separate adversarial money-path review. No real launch is part of this delivery.

| Client request | Production upstream |
| --- | --- |
| `POST /check` | `POST https://api.imd.fun/requests/check` |
| `POST /import` | `POST https://api.imd.fun/requests/import` |
| `GET /launches` (including query parameters) | Same path on `https://api.imd.fun` |
| `GET /launches/:id` | Same path |
| `GET /jobs/:id` | Same path |
| `GET /intake/:chain/:tx` | Same path; positive numeric chain, full transaction hash |

Everything else returns 404 or 405 before fetching. Browser CORS preflight is handled only for an allowed path, its exact method, and Content-Type/Accept headers; it never reaches upstream. Every response, including errors, has `Access-Control-Allow-Origin: *`. Requests do not forward cookies, authorization or arbitrary client headers. Upstream redirects are refused, keeping the relay on its fixed origin. It cannot submit a paid request or broadcast a transaction.

Successful GET responses use Cloudflare's default Cache API with `Cache-Control: public, max-age=30`. The full URL, including its query, is the cache key. POSTs and errors use `no-store`. Cache entries are local to a Cloudflare data center. JSON POST bodies are limited to 64 KiB; the site's paid composer separately enforces 16 KiB. An unavailable upstream returns 502 with a retry message.

Run the fetch-mock unit tests with Node 24+ (no dependencies):

```sh
node --test relay/worker.test.mjs
```

They check every allowed route, exact POST forwarding, credential stripping, 30-second expiry, query separation, CORS/preflight, rejection of other paths/methods, non-JSON/large bodies, upstream errors and redirects. They emulate the Cache API; deployed Cloudflare edge behavior is an operator check after deployment. Frontend relay tests and actual results are documented in `VALIDATION.md`.
