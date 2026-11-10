import {audienceContent} from './contentAccess.mjs';
import {readingSections} from './interactiveReading.mjs';

export function readingPdfDefinition(source, audience) {
  const study = audienceContent(source, audience);
  const plain = text => String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1');
  const body = text => ({text:plain(text), margin:[0, 0, 0, 10]});
  return {
    pageSize:'A4',
    pageMargins:[48, 44, 48, 48],
    info:{title:study.title, author:'Central de Estudos Bíblicos — IBNE'},
    defaultStyle:{fontSize:11, lineHeight:1.25},
    footer:(page, total)=>({text:page+' / '+total, alignment:'center', fontSize:9}),
    content:[
      {text:'Central de Estudos Bíblicos — Igreja Batista Nova Esperança', fontSize:10, color:'#24588c'},
      {text:plain(study.title), fontSize:19, bold:true, margin:[0, 10, 0, 12]},
      ...[study.passage, study.theme].filter(Boolean).map(body),
      ...readingSections(study).flatMap(([title,text])=>[
        {text:plain(title), fontSize:13, bold:true, margin:[0, 8, 0, 5]},
        body(text),
      ]),
    ],
  };
}

export async function downloadReadingPdf(study, audience) {
  const [{default:pdfMake}, {default:fonts}] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js'),
  ]);
  pdfMake.addVirtualFileSystem(fonts);
  const name = (study.title || 'leitura-ceb').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pdf = pdfMake.createPdf(readingPdfDefinition(study, audience));
  const blob = await new Promise(resolve => pdf.getBlob(resolve));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = (name || 'leitura-ceb') + '.pdf';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
