#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
export async function serve({ directory = resolve(ROOT, 'dist'), port = 0, prefix = '/preview/' } = {}) {
  directory = resolve(directory);
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname === '/') { res.writeHead(302, { Location: prefix }); res.end(); return; }
      if (!pathname.startsWith(prefix)) { res.writeHead(404); res.end(); return; }
      const path = resolve(directory, pathname.slice(prefix.length) || 'index.html');
      if (!path.startsWith(directory + sep)) { res.writeHead(403); res.end(); return; }
      const info = await stat(path);
      if (!info.isFile()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(await readFile(path));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const portIndex = process.argv.indexOf('--port'), dirIndex = process.argv.indexOf('--dir');
  const server = await serve({ port: portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4173, ...(dirIndex >= 0 ? { directory: resolve(process.argv[dirIndex + 1]) } : {}) });
  console.log(`Preview ready at http://127.0.0.1:${server.address().port}/preview/`);
  const close = () => server.close(() => process.exit(0));
  process.on('SIGTERM', close); process.on('SIGINT', close);
}
