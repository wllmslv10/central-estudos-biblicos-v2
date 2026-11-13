import { readFile, writeFile } from 'node:fs/promises';
import { BlobReader, BlobWriter, TextWriter, TextReader, ZipReader, ZipWriter } from '@zip.js/zip.js';

const directory = new URL('../dist/gerador-ibne/', import.meta.url);
const online = new URL('index.html', directory);
const offline = new URL('Gerador_IBNE_Questionario_Corrigido.zip', directory);
const anchor = '  const slides = pages.map((page, index) => slideShell';
const cleanup = String.raw`  const cleanSlideText = text => text.replace(/(?<!\\)\\[ \t\r]*$/gm, '');
  pages = pages.map(page => ({
    ...page, title: cleanSlideText(page.title), paragraphs: page.paragraphs.map(cleanSlideText),
  }));
`;
function patch(html) {
  if (html.includes(cleanup)) return html;
  if (html.split(anchor).length !== 2) throw new Error('Não foi possível localizar a montagem dos slides do Gerador IBNE.');
  return html.replace(anchor, cleanup + anchor);
}

const correctedOnline = patch(await readFile(online, 'utf8'));
const reader = new ZipReader(new BlobReader(new Blob([await readFile(offline)])));
const writer = new ZipWriter(new BlobWriter('application/zip'));
let generatorFound = false;
for (const entry of await reader.getEntries()) {
  const options = { lastModDate: entry.lastModDate };
  if (entry.filename === 'Gerador_IBNE.html') {
    const corrected = patch(await entry.getData(new TextWriter()));
    await writer.add(entry.filename, new TextReader(corrected), options);
    generatorFound = true;
  } else {
    await writer.add(entry.filename, new BlobReader(await entry.getData(new BlobWriter())), options);
  }
}
await reader.close();
if (!generatorFound) throw new Error('Gerador IBNE ausente no ZIP offline.');
const correctedOffline = await writer.close();
await writeFile(online, correctedOnline);
await writeFile(offline, new Uint8Array(await correctedOffline.arrayBuffer()));
