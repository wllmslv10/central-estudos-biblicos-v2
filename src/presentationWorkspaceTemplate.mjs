export const workspaceStyle = `
*{box-sizing:border-box}body{margin:0;background:#e8f1fa;color:#133354;font:15px system-ui,Arial,sans-serif;height:100vh;overflow:hidden}
header{height:53px;background:#102f51;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:8px 18px;gap:10px}
header strong{font-size:17px}header small{font-size:12px;color:#c9dfef}
button{border:1px solid #92b7d9;background:#edf6ff;border-radius:7px;padding:8px 11px;color:#113c60;font-weight:650;cursor:pointer}button:hover{background:#d7eaff}button:disabled{opacity:.4;cursor:default}
.primary{background:#ffd27b;border-color:#f1b653;color:#18324e}.wrap{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.88fr);gap:10px;padding:10px;height:calc(100vh - 53px)}
.panel{background:#fff;border:1px solid #d0e0ef;border-radius:12px;padding:12px;min-height:0;overflow:hidden}
.left{display:flex;flex-direction:column;gap:8px}.left h2,.right h2{margin:0;font-size:16px}.stage{flex:1;min-height:0;border:1px solid #aec8df;border-radius:8px;overflow:hidden;background:#0e2b4a;position:relative}
.stage iframe{border:0;width:1600px;height:900px;background:#fff;transform-origin:top left;position:absolute;top:0;left:0}
.controls{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px}
.preview{background:#edf5ff;border:1px solid #b8d2eb;border-radius:8px;padding:9px;min-height:118px;max-height:25%;overflow:auto}
.preview p{margin:4px 0;font-size:13px;line-height:1.4}
.next-title{font-weight:750;color:#143e65}.muted{font-size:12px;color:#59758d}
.right{display:grid;grid-template-rows:minmax(100px,.8fr) auto minmax(0,2fr);gap:10px;min-height:0}
.right>.panel{display:flex;flex-direction:column;gap:8px;overflow:auto}
.right>.panel:nth-child(2){padding:10px 12px;gap:5px;min-height:76px;max-height:116px;overflow:hidden}
.right>.panel:nth-child(2) .note{font-size:11px;line-height:1.25}
#privateNotesPanel{overflow:hidden;gap:7px}
#privateNotesPanel .private-editor{min-height:0;flex:1;overflow:auto}
#privateNotesPanel>.note{display:none}
#privateNotesPanel .note-actions{flex-shrink:0}
.right p{line-height:1.48;margin:0;font-size:14px;white-space:pre-line}
textarea.private-editor{width:100%;flex:1;min-height:90px;resize:none;border:1px solid #bfd3e5;border-radius:8px;padding:10px;font:14px/1.5 system-ui;color:#18324e;background:#fffef9}
.note-actions{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.note-actions button{font-size:12px;padding:6px 9px}
.note-actions .note{margin-left:auto}
.notes{background:#fff7e7;border-left:4px solid #e3a739;padding:9px;border-radius:5px}
.pills{display:flex;flex-wrap:wrap;gap:6px}.pills button{font-size:12px;padding:6px 9px}
.status{font-size:12px;color:#c6dfec}.note{font-size:12px;color:#58758e}
.overlay{display:none;position:fixed;inset:0;background:#001a2bbd;align-items:center;justify-content:center;z-index:20;padding:20px}
.overlay.open{display:flex}.modal{width:min(580px,100%);background:#fff;border-radius:12px;padding:22px}
.modal p{line-height:1.5}
@media(max-width:850px){body{height:auto;overflow:auto}.wrap{display:block;height:auto}.left{height:80vh;margin-bottom:10px}.right{height:auto}.right>.panel{min-height:140px;margin-bottom:10px}}
header .header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}body:fullscreen{height:100dvh;width:100vw}body:fullscreen .wrap{height:calc(100dvh - 65px)}@media(max-width:760px){header .header-actions{justify-content:flex-end}header .header-actions button{font-size:12px}}`;
export const workspaceMarkup = `<header><div><strong>CEB · Modo Professor</strong><div class="status" id="status">Preparando apresentação original…</div></div><div class="header-actions"><button id="teacherFullscreen" title="Expandir toda a área do professor">⛶ Tela cheia — Professor</button><button class="primary" id="openStudent">Abrir Área do Aluno / Datashow ↗</button></div></header>
<main class="wrap">
<section class="panel left">
<h2>Slide atual — apresentação original do aluno</h2>
<div class="stage"><iframe id="presentation" title="Apresentação original"></iframe></div>
<div class="controls"><button id="previous">← Voltar</button><strong id="counter">—</strong><button id="next">Avançar →</button><button id="fullscreen" title="Exibir apenas o slide em tela cheia">Tela cheia — Slide</button><button id="print">Imprimir</button></div>
<div class="preview"><div class="muted">PRÓXIMO SLIDE · SOMENTE PROFESSOR</div><div class="next-title" id="nextTitle"></div><p id="nextBody"></p><div class="muted" id="nextRefs"></div></div>
</section>
<section class="right">
<div class="panel"><h2>Resumo do slide atual</h2><p id="summary"></p><div class="note">Resumo do conteúdo apresentado.</div></div>
<div class="panel"><h2>Referências bíblicas deste slide</h2><div id="refs" class="pills"></div><div class="note">Clique em uma referência para consultar em uma janela sobreposta.</div></div>
<div class="panel" id="privateNotesPanel"><h2>Anotações privadas do professor</h2><div class="note-actions"><button id="slideNotesTab" aria-pressed="true">Do slide atual</button><button id="generalNotesTab" aria-pressed="false">Gerais da aula</button><button id="exportNotes">Exportar anotações ↓</button></div><textarea class="private-editor" id="notesEditor" aria-label="Anotações privadas editáveis" placeholder="Escreva suas anotações aqui…"></textarea><div class="note-actions"><button id="saveNotes" class="primary">Salvar anotações</button><span class="note" id="noteSaveStatus" role="status">Salvas somente neste navegador.</span></div><div class="note">As anotações não aparecem no datashow. Estas anotações são locais a este navegador.</div></div>
</section>
</main>
`;
