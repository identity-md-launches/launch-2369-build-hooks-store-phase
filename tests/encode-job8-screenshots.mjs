// Optional artifact encoding only. App builds and browser tests do not need sharp.
// Install sharp outside this repo, then pass its entry point followed by the PNGs.
import { readFile, writeFile, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const [modulePath, ...inputs] = process.argv.slice(2);
if (!modulePath || !inputs.length) throw new Error('Pass the external sharp entry point and captured PNG paths.');
const { default: sharp } = await import(pathToFileURL(resolve(modulePath)).href);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const results = [];
for (const input of inputs) {
  const name = basename(input);
  if (!/^(?:builder-(?:prompt|blocks)-(?:320|390|1440)|first-screen-390)\.png$/.test(name)) throw new Error(`Unexpected screenshot name: ${name}`);
  const output = new URL(`results/job8/${name.replace(/\.png$/, '.webp')}`, import.meta.url);
  const outputPath = fileURLToPath(output);
  await sharp(input).webp({ lossless: true, effort: 6 }).toFile(outputPath);
  const before = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const after = await sharp(outputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (!before.data.equals(after.data) || before.info.width !== after.info.width || before.info.height !== after.info.height) throw new Error('Screenshot pixels changed.');
  results.push({ file: basename(output.pathname), width: before.info.width, height: before.info.height,
    pngBytes: (await stat(input)).size, webpBytes: (await stat(output)).size,
    pngSha256: digest(await readFile(input)), webpSha256: digest(await readFile(output)),
    decodedRgbaSha256: digest(before.data), pixelIdentical: true });
}
await writeFile(new URL('results/job8/screenshot-encoding.json', import.meta.url), JSON.stringify({ encoding: 'lossless WebP', resized: false, results }, null, 2) + '\n');
console.log(`Encoded ${results.length} screenshots; every decoded RGBA pixel is identical.`);
