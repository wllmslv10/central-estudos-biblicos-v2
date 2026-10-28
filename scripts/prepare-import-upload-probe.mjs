// Preparation only: no HTTP, credentials, database access, uploads or deletions.
// Reuses the technical DOCX/PPTX fixtures; creates a complete small PDF and HTML.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const destination=resolve(process.argv[2]||'/tmp/ceb-upload-probe-'+randomUUID());
await mkdir(destination,{mode:0o700}); // Refuse any pre-existing destination.
const samples=JSON.parse(await readFile(new URL('../api-worker/test/original-samples.json',import.meta.url),'utf8'));
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
const stream='BT /F1 14 Tf 50 780 Td (CEB - TESTE TECNICO SEM DADOS PESSOAIS) Tj ET';objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${body}\nendobj\n`;});const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
const files={pdf:Buffer.from(pdf),docx:Buffer.from(samples.docx,'base64'),pptx:Buffer.from(samples.pptx,'base64'),html:Buffer.from('<!doctype html><html lang="pt-BR"><meta charset="UTF-8"><h1>CEB — TESTE TÉCNICO</h1><p>Arquivo técnico sem dados pessoais para conferir a importação.</p></html>')},manifest={preparationOnly:true,networkCalls:0,productionWrites:0,files:[]};
for(const [format,bytes]of Object.entries(files)){const name='ceb-teste-tecnico.'+format;await writeFile(resolve(destination,name),bytes,{flag:'wx',mode:0o600});manifest.files.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(resolve(destination,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
console.log(JSON.stringify({prepared:true,destination,files:manifest.files.length,networkCalls:0,productionWrites:0}));
