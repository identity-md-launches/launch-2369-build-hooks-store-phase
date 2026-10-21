// Fixed-origin, public-data relay for SPEC 7.4. No credentials or bindings required.
const ORIGIN = 'https://api.imd.fun';
const CORS = { 'Access-Control-Allow-Origin': '*' };
function route(path) {
  if (path === '/check' || path === '/import') return { method: 'POST', upstream: `/requests${path}` };
  if (path === '/launches' || /^\/(launches|jobs)\/[a-zA-Z0-9_-]+$/.test(path) || /^\/intake\/[1-9]\d*\/0x[\da-fA-F]{64}$/.test(path)) return { method: 'GET', upstream: path };
  return null;
}
const error = (status, detail, headers = {}) => new Response(JSON.stringify({ error: detail }), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

export default {
  async fetch(request, _env, context) {
    const url = new URL(request.url), target = route(url.pathname);
    if (!target) return error(404, 'Path not allowed');
    // Only a valid route and its exact method may be preflighted. OPTIONS never reaches upstream.
    if (request.method === 'OPTIONS') {
      const method = request.headers.get('Access-Control-Request-Method');
      const headers = (request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
      if (method !== target.method || headers.some(h => h !== 'content-type' && h !== 'accept')) return error(405, 'Preflight not allowed');
      return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': target.method, 'Access-Control-Allow-Headers': 'Content-Type, Accept', 'Access-Control-Max-Age': '86400' } });
    }
    if (request.method !== target.method) return error(405, 'Method not allowed', { Allow: `${target.method}, OPTIONS` });
    const upstream = new URL(target.upstream, ORIGIN);
    upstream.search = url.search;
    const cache = globalThis.caches?.default;
    const key = new Request(url.href, { method: 'GET' });
    if (target.method === 'GET' && cache) {
      try { const hit = await cache.match(key); if (hit) return hit; }
      catch { /* A cache outage must not hide an otherwise readable upstream. */ }
    }
    try {
      const headers = { Accept: 'application/json' };
      let body;
      if (target.method === 'POST') {
        if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return error(415, 'Send application/json');
        body = await request.text();
        if (new TextEncoder().encode(body).length > 65536) return error(413, 'Body exceeds 64 KiB');
        headers['Content-Type'] = 'application/json';
      }
      const result = await fetch(upstream, { method: target.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(20000) });
      // Do not redirect the browser or follow an upstream redirect to another origin.
      if (result.status >= 300 && result.status < 400) return error(502, 'Unexpected upstream redirect');
      const cacheable = target.method === 'GET' && result.status === 200;
      // Read the JSON bytes so Workers decodes any upstream compression before we
      // construct a response with our own small, public header allowlist.
      const payload = await result.arrayBuffer();
      const response = new Response(result.status === 204 ? null : payload, { status: result.status, headers: {
        ...CORS, 'Content-Type': result.headers.get('Content-Type') || 'application/json',
        'Cache-Control': cacheable ? 'public, max-age=30' : 'no-store',
      } });
      if (cacheable && cache) {
        const pending = cache.put(key, response.clone()).catch(() => {});
        if (context?.waitUntil) context.waitUntil(pending); else await pending;
      }
      return response;
    } catch { return error(502, 'IMD is unavailable. Try again.'); }
  },
};
