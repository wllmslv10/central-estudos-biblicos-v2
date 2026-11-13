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

const correctedOnline = patch(await readFile(online, 'utf8')).replace(
  " button.onclick = () => {",
  ` let sent;
 window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== window.opener ||
      event.data?.type !== 'ibne-generator-saved' || !sent || event.data.requestId !== sent.requestId) return;
  const unchanged = sent.mode === materialMode && fields.every(id => $(id).value === sent.values[id]) &&
    !$('generate').disabled && !$('revise').disabled;
  sent = undefined;
  if (!unchanged) {
   message('cebExportStatus', 'Material salvo na Biblioteca IBNE. As alterações atuais foram preservadas.');
   return;
  }
  for (const id of fields) $(id).value = id === 'quizCount' ? '5' : '';
  delete record.approved;
  pendingStudy = undefined;
  persist();
  for (const id of ['status', 'studyStatus', 'quizStatus']) message(id, '');
  message('cebExportStatus', 'Material salvo na Biblioteca IBNE. Pronto para começar outro.');
 });
 button.onclick = () => {`,
).replace(
  "   window.opener.postMessage({ type: 'ibne-generator-package', zip, area:",
  `   sent = {requestId: crypto.randomUUID(), mode: materialMode, values: Object.fromEntries(fields.map(id => [id, $(id).value]))};
   window.opener.postMessage({ type: 'ibne-generator-package', zip, requestId: sent.requestId, area:`,
);
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
