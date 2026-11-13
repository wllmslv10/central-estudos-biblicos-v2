import { readFile, writeFile } from 'node:fs/promises';
import { BlobReader, BlobWriter, TextWriter, TextReader, ZipReader, ZipWriter } from '@zip.js/zip.js';

const directory = new URL('../dist/gerador-ibne/', import.meta.url);
const online = new URL('index.html', directory);
const offline = new URL('Gerador_IBNE_Questionario_Corrigido.zip', directory);
const anchor = '  const slides = pages.map((page, index) => slideShell';
const cleanup = String.raw`  const cleanSlideText = text => text.replace(/(?<!\\)\\[ \t\r]*$/gm, '');
  const cleanTitle = text => text.replace(/\*{2,3}([^*\r\n]+)\*{2,3}/g, (_, title) => title).trim();
  pages = pages.map(page => ({
    ...page, title: cleanTitle(cleanSlideText(page.title)), paragraphs: page.paragraphs.map(text => cleanTitle(cleanSlideText(text).replace(/^[ \t]*(?:>[ \t]*)+/gm, ''))),
  }));
`;
const sermonPackageAnchor = " const files=[[manifest.files.presentation,presentation],[manifest.files.reading,payload.reading]];";
const sermonPackage = `
 if(materialMode==='sermon'){
  for(const [role, filename] of [['sermonOutline','sermon-outline.html'],['sermonPulpit','sermon-pulpit.html']]){
   if(!payload[role]) continue;
   manifest.files[role]=filename;
   files.push([filename,payload[role]]);
  }
 }
`;
const packagePayloadAnchor = '  if (packageOutput) Object.assign(packageOutput,{title,reading:studentReading});';
const sermonPayload = `
  if (packageOutput && materialMode === 'sermon') {
    if (studyText) packageOutput.sermonOutline = studyReader(title, studyText);
    if (pulpitText) packageOutput.sermonPulpit = studyReader('Roteiro de púlpito', pulpitText);
  }
`;

const sermonChanges = [
  [
    "$('sermonReader').onclick=()=>{\n const text=$('study').value.trim();\n if(!text) return message('studyStatus','Insira o esboço antes de baixar.');\n const full=text.split(/^##\\s+Apresentação IBNE\\s*$/im)[0].trim();\n const title=full.match(/^#\\s+(.+)/)?.[1] || $('theme').value.trim() || 'Esboço de sermão';\n download(safeName()+'_leitura.html',studyReader(title,full),'text/html;charset=utf-8');\n message('studyStatus','HTML para leitura preparado para download.');\n};\n\n",
    "$('sermonReader').onclick=()=>{\n const text=$('study').value.trim();\n if(!text) return message('studyStatus','Insira o esboço antes de baixar.');\n const full=text.split(/^##[^\\S\\r\\n]+Apresentação IBNE[^\\S\\r\\n]*$/im)[0].trim();\n const marker=findPulpitHeading(full);\n const outline=marker ? full.slice(0,marker.index).trim() : full;\n if(!outline) return message('studyStatus','Insira o esboço completo antes do roteiro de púlpito.');\n const title=outline.match(/^#\\s+(.+)/)?.[1] || $('theme').value.trim() || 'Esboço de sermão';\n download(safeName()+'_esboco_completo.html',studyReader(title,outline),'text/html;charset=utf-8');\n message('studyStatus','HTML do esboço completo preparado para download.');\n};\n\n$('pulpitReader').onclick=()=>{\n const text=$('study').value.trim();\n const full=text.split(/^##[^\\S\\r\\n]+Apresentação IBNE[^\\S\\r\\n]*$/im)[0];\n const marker=findPulpitHeading(full);\n const pulpit=marker ? full.slice(marker.index+marker[0].length).trim() : '';\n if(!pulpit) return message('studyStatus','Inclua a seção “## Roteiro de púlpito” antes da apresentação para baixar o roteiro.');\n download(safeName()+'_roteiro_de_pulpito.html',studyReader('Roteiro de púlpito',pulpit),'text/html;charset=utf-8');\n message('studyStatus','HTML do roteiro de púlpito preparado para download.');\n};\n\n"
  ],
  [
    " $('sermonReader').hidden=!sermon;",
    " $('sermonReader').hidden=!sermon;\n $('pulpitReader').hidden=!sermon;"
  ],
  [
    "<button id=\"sermonReader\" hidden>Baixar leitura para tablet (.html)</button>",
    "<button id=\"sermonReader\" hidden>Baixar esboço completo para leitura (.html)</button><button id=\"pulpitReader\" type=\"button\" hidden>Baixar roteiro de púlpito para leitura (.html)</button>"
  ],
  [
    "function exportPresentation(compact",
    "function findPulpitHeading(text){\n  return /^##[^\\S\\r\\n]+Roteiro de púlpito[^\\S\\r\\n]*$/im.exec(text);\n}\n\nfunction exportPresentation(compact"
  ]
];

const normalizeHeadings = String.raw`function normalizeSermonHeadings(text){
  return text.replace(/^(#{1,3}[^\S\r\n]+)(\*{2,3}|_{2,3})([^\r\n]+?)\2([^\S\r\n]*)$/gm, '$1$3$4');
}

`;

function patch(html) {
  for (const [before, after] of sermonChanges) {
    if (html.includes(after)) continue;
    if (!html.includes(before)) throw new Error("Não foi possível atualizar a leitura de sermão.");
    html = html.replace(before, () => after);
  }
  html = html
    .replace('function findPulpitHeading(text){', normalizeHeadings + 'function findPulpitHeading(text){')
    .replace('Antes dos slides, acrescente uma seção separada', 'Formatação obrigatória: use cabeçalhos Markdown simples. Depois de #, ## ou ###, escreva o título diretamente, sem negrito, itálico ou crases. Use exatamente os cabeçalhos indicados e mantenha DATASHOW: e PROFESSOR: em linhas próprias. Entregue o Markdown sem bloco de código.\n\nAntes dos slides, acrescente uma seção separada')
    .replace("const content = $('study').value.trim();", "const rawContent = $('study').value.trim();\n  const content = materialMode === 'sermon' ? normalizeSermonHeadings(rawContent) : rawContent;")
    .replaceAll("const text=$('study').value.trim();\n const full=text.split", "const text=normalizeSermonHeadings($('study').value.trim());\n const full=text.split")
    .replace("const text=$('study').value.trim();\n if(!text) return message('studyStatus','Insira o esboço antes de baixar.');", "const text=normalizeSermonHeadings($('study').value.trim());\n if(!text) return message('studyStatus','Insira o esboço antes de baixar.');");
  if (!html.includes(sermonPackageAnchor) || !html.includes(packagePayloadAnchor)) {
    throw new Error('Não foi possível localizar o pacote de sermão.');
  }
  if (!html.includes(sermonPackage)) html = html.replace(sermonPackageAnchor, sermonPackageAnchor + sermonPackage);
  if (!html.includes(sermonPayload)) html = html.replace(packagePayloadAnchor, packagePayloadAnchor + sermonPayload);
  if (html.includes('  const cleanTitle = text =>')) return html;
  if (html.split(anchor).length !== 2) throw new Error('Não foi possível localizar a montagem dos slides do Gerador IBNE.');
  const titleAnchor = "  const title = heading ? heading[1] : $('theme').value.trim() || 'Estudo Bíblico IBNE';";
  if (!html.includes(titleAnchor)) throw new Error('Título do Gerador IBNE não localizado.');
  const titleCleanup = cleanup.slice(cleanup.indexOf('  const cleanTitle'), cleanup.indexOf('  pages = pages.map'));
  return html.replace(anchor, cleanup.replace(titleCleanup, '') + anchor)
    .replace(titleAnchor, titleCleanup + "  const title = cleanTitle(heading ? heading[1] : $('theme').value.trim() || 'Estudo Bíblico IBNE');");
}

const correctedOnline = patch(await readFile(online, 'utf8')).replace(
  `$('exportCeb').onclick=()=>{`,
  `$('exportCeb').onclick=()=>{
 $('cebExportStatus').removeAttribute('style');`,
).replace(
  " button.onclick = () => {",
  ` let sent;
 window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== window.opener ||
      event.data?.type !== 'ibne-generator-saved' || !sent || event.data.requestId !== sent.requestId) return;
  const unchanged = sent.mode === materialMode && fields.every(id => $(id).value === sent.values[id]) &&
    !$('generate').disabled && !$('revise').disabled;
  sent = undefined;
  $('cebExportStatus').style.cssText = 'color:#14532d;background:#dcfce7;border:1px solid #86c99b;border-radius:8px;padding:8px 12px;font-weight:700';
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
 button.onclick = () => {
  $('cebExportStatus').removeAttribute('style');`,
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
