import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const out = 'tests/results/job8'; mkdirSync(out, { recursive: true });
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const walk = directory => readdirSync(directory).flatMap(name => {
  const path = join(directory, name); return statSync(path).isDirectory() ? walk(path) : [path];
});
const html = readFileSync('dist/index.html', 'utf8');
const missing = [], absolute = [];
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = match[1]; if (/^(?:https?:|data:|#)/.test(url)) continue;
  if (url.startsWith('/')) absolute.push(url);
  try { statSync(resolve('dist', url)); } catch { missing.push(url); }
}
for (const css of walk('dist').filter(p => p.endsWith('.css'))) for (const match of readFileSync(css, 'utf8').matchAll(/url\((?:["']?)([^)'"\s]+)(?:["']?)\)/g)) {
  if (/^(?:https?:|data:|#)/.test(match[1])) continue;
  if (match[1].startsWith('/')) absolute.push(match[1]);
  try { statSync(resolve(dirname(css), match[1])); } catch { missing.push(`${css}: ${match[1]}`); }
}
const publicMismatches = walk('public').filter(p => {
  try { return hash(p) !== hash(join('dist', relative('public', p))); } catch { return true; }
});
const config = JSON.parse(readFileSync('dist/site-config.json', 'utf8'));
const metadata = { title: /<title>.+<\/title>/.test(html), favicon: /rel="icon"/.test(html), description: /name="description"/.test(html), ogTitle: /property="og:title"/.test(html), ogImage: /property="og:image"/.test(html) };
const js = walk('dist/assets').filter(p => p.endsWith('.js')).map(p => readFileSync(p, 'utf8')).join('\n');
const integrity = {
  metadata, absoluteRuntimeReferences: absolute, missingReferences: missing, publicMismatches,
  relayUrl: config.relayUrl, inProgress: config.inProgress,
  testRelayAbsentFromBundle: !js.includes('relay.hooks.test'),
  runtimeFiles: walk('dist').sort().map(path => ({ path, bytes: statSync(path).size, sha256: hash(path) })),
  specSha256: hash('SPEC.md'),
};
integrity.passed = Object.values(metadata).every(Boolean) && !absolute.length && !missing.length && !publicMismatches.length && config.relayUrl === 'https://hooks-store-relay.hooks-store.workers.dev' && config.inProgress === false && integrity.testRelayAbsentFromBundle;
writeFileSync(`${out}/export-integrity.json`, JSON.stringify(integrity, null, 2) + '\n');

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const changed = git('diff', '--name-only', 'HEAD');
const protectedPath = p => /(^|\/)(?:foundry\.toml|foundry\.lock|remappings\.txt|\.gitmodules|package\.json|[^/]*lock[^/]*\.(?:json|yaml|yml))$/.test(p) || /^(?:lib|\.git|\.github|node_modules)\//.test(p) || /(^|\/)\.env(?:\.|$)/.test(p);
const protectedChanges = changed.filter(protectedPath);
const files = [...new Set([...git('ls-files'), ...git('ls-files', '--others', '--exclude-standard')])].filter(p => !p.startsWith('.imd/') && !p.startsWith('test/scratch/')).filter(p => { try { return statSync(p).isFile(); } catch { return false; } });
const forbidden = files.filter(p => /(^|\/)(node_modules|\.npm|\.cache|\.vite|\.playwright-mcp|__pycache__|playwright-report|test-results)(\/|$)|\.(?:tgz|zip)$/.test(p));
const submodules = git('ls-files', '--stage').filter(line => line.startsWith('160000 '));
const raw = files.reduce((sum, p) => sum + statSync(p).size, 0);
// A conservative uncompressed tar envelope includes a 512-byte header and padding
// per file, plus 16 KiB reserved for this report/packaging metadata.
const reserved = 16384;
const tarEnvelope = files.reduce((sum, p) => sum + 512 + Math.ceil(statSync(p).size / 512) * 512, 1024) + reserved;
// Measure a complete, standalone Git bundle in /tmp. The assignment caps the Git
// submission bundle, not the uncompressed checkout. Keep all earlier evidence.
// This never changes the workspace's .git or commits anything to its history.
const temporary = mkdtempSync(join(tmpdir(), 'hooks-delivery-'));
let bundleBytes;
try {
  const repository = join(temporary, 'snapshot.git');
  const gitEnv = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
  const run = args => execFileSync('git', args, { env: gitEnv, stdio: ['pipe', 'pipe', 'pipe'] });
  run(['init', '--bare', '--initial-branch=delivery', repository]);
  const chunks = [Buffer.from('commit refs/heads/delivery\ncommitter Delivery byte check <build@localhost> 0 +0000\ndata 23\nComplete delivery check\n')];
  for (const path of files.sort()) {
    const bytes = readFileSync(path), mode = statSync(path).mode & 0o111 ? '100755' : '100644';
    chunks.push(Buffer.from(`M ${mode} inline ${JSON.stringify(path)}\ndata ${bytes.length}\n`), bytes, Buffer.from('\n'));
  }
  chunks.push(Buffer.from('\ndone\n'));
  execFileSync('git', ['--git-dir', repository, 'fast-import', '--quiet'], { env: gitEnv, input: Buffer.concat(chunks), stdio: ['pipe', 'pipe', 'pipe'] });
  const bundle = join(temporary, 'delivery.bundle');
  run(['--git-dir', repository, 'bundle', 'create', bundle, 'refs/heads/delivery']);
  bundleBytes = statSync(bundle).size;
} finally { rmSync(temporary, { recursive: true, force: true }); }
const budget = { limitBytes: 8388608, candidateFiles: files.length, rawFileBytes: raw, conservativeUncompressedTarBytes: tarEnvelope, completeSnapshotGitBundleBytes: bundleBytes, reservedMetadataBytes: reserved, headroomBytes: 8388608 - bundleBytes - reserved, protectedPathsChanged: protectedChanges, dependencyOrCachePaths: forbidden, submodules, excludedInputs: ['.imd/', 'test/scratch/'], passed: bundleBytes + reserved < 8388608 && !protectedChanges.length && !forbidden.length && !submodules.length };
writeFileSync(`${out}/submission-budget.json`, JSON.stringify(budget, null, 2) + '\n');
console.log(JSON.stringify({ exportIntegrity: integrity.passed, ...budget }, null, 2));
if (!integrity.passed || !budget.passed) process.exitCode = 1;
