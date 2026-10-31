import { useCallback, useEffect, useState } from 'react'
import { cebApi, cloudMaterials, listCloudStudies, type CloudMaterial } from './cebApi'

type User = { id: string; is_active: boolean; app_role: string }
type Snapshot = { files: CloudMaterial[]; studies: number; users: User[]; fetchedAt: string; responseMs: number }
const formatBytes = (value: number) => value >= 1024 ** 3 ? (value / 1024 ** 3).toFixed(2) + ' GB' : (value / 1024 ** 2).toFixed(2) + ' MB'
const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value)
function Metric({ name, value, detail }: { name: string; value: string; detail?: string }) {
  return <article style={{border:'1px solid #d8e2ef',borderRadius:10,padding:16,background:'#fff',minWidth:180,flex:'1 1 180px'}}>
    <p style={{margin:'0 0 8px',color:'#42566e'}}>{name}</p><strong style={{fontSize:'1.5rem',color:'#174778'}}>{value}</strong>{detail && <p style={{margin:'8px 0 0',fontSize:'.85rem'}}>{detail}</p>}
  </article>
}
export default function ConsumptionPanel({ token }: { token: string }) {
  const [snapshot,setSnapshot] = useState<Snapshot|null>(null)
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const [expanded,setExpanded] = useState(false)
  const refresh = useCallback(async () => {
    setLoading(true);setError('')
    try {
      const started = performance.now()
      const [materials,studies,users] = await Promise.all([
        cloudMaterials(token),listCloudStudies(token),cebApi<{users:User[]}>('/admin/users',{token})
      ])
      setSnapshot({files:materials.materials,studies:studies.studies.length,users:users.users,fetchedAt:new Date().toLocaleString('pt-BR'),responseMs:Math.round(performance.now()-started)})
    } catch(e) {setError(e instanceof Error?e.message:'Não foi possível consultar o consumo.')}
    finally {setLoading(false)}
  },[token])
  useEffect(()=>{if(expanded) void refresh()},[refresh,expanded])
  const files = snapshot?.files ?? []
  const bytes = files.reduce((sum,f)=>sum+(Number.isFinite(Number(f.byte_size))?Math.max(0,Number(f.byte_size)):0),0)
  const pdf = files.filter(f=>f.mime_type==='application/pdf').length
  const html = files.filter(f=>/html/i.test(f.mime_type)).length
  const docx = files.filter(f=>/wordprocessingml|msword/i.test(f.mime_type)).length
  const types = [
    {name:'PDF',count:pdf,bytes:files.filter(f=>f.mime_type==='application/pdf').reduce((a,f)=>a+Number(f.byte_size||0),0)},
    {name:'HTML',count:html,bytes:files.filter(f=>/html/i.test(f.mime_type)).reduce((a,f)=>a+Number(f.byte_size||0),0)},
    {name:'Word',count:docx,bytes:files.filter(f=>/wordprocessingml|msword/i.test(f.mime_type)).reduce((a,f)=>a+Number(f.byte_size||0),0)},
    {name:'Outros',count:files.length-pdf-html-docx,bytes:files.filter(f=>f.mime_type!=='application/pdf'&&!/html|wordprocessingml|msword/i.test(f.mime_type)).reduce((a,f)=>a+Number(f.byte_size||0),0)}
  ]
  const days = Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(13-i));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})
  const daily = days.map(day=>({day,count:files.filter(f=>f.created_at?.slice(0,10)===day).length}))
  const peak = Math.max(1,...daily.map(d=>d.count))
  const providers = [
    {name:'Neon — banco de dados',metrics:'Tamanho do Postgres, horas de compute, conexões, transferência e limite do projeto',url:'https://console.neon.tech/'},
    {name:'Neon — arquivos',metrics:'Objetos armazenados, espaço utilizado e operações do armazenamento',url:'https://console.neon.tech/'},
    {name:'Cloudflare Workers',metrics:'Requisições, CPU, erros, limites e consumo diário',url:'https://dash.cloudflare.com/'},
    {name:'Cloudflare Workers AI',metrics:'Neurônios/tokens, falhas, uso por modelo e franquia',url:'https://dash.cloudflare.com/'},
    {name:'GitHub Actions e Pages',metrics:'Minutos, armazenamento de artefatos, implantações e tráfego',url:'https://github.com/wllmslv10/central-estudos-biblicos-v2/actions'}
  ]
  const downloadCsv = () => {
    if(!snapshot)return
    const lines = [['indicador','valor'],['arquivos',files.length],['bytes_arquivos_listados',bytes],['pdf',pdf],['html',html],['word',docx],['estudos_visiveis',snapshot.studies],['usuarios_ativos',snapshot.users.filter(u=>u.is_active).length]]
    const csv='\uFEFF'+lines.map(row=>row.join(';')).join('\r\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    const link=document.createElement('a');link.href=url;link.download='ceb-consumo.csv';link.click();URL.revokeObjectURL(url)
  }
  return <section aria-label="Consumo e armazenamento" style={{marginTop:18}}>
    <h2>📊 Consumo e armazenamento</h2>
    <button type="button" aria-expanded={expanded} aria-controls="ceb-consumo-detalhes" onClick={()=>setExpanded(v=>!v)}>{expanded ? "Ocultar painel detalhado" : "Mostrar painel detalhado"}</button>
    {expanded && <div id="ceb-consumo-detalhes">
    <p>Indicadores reais dos registros acessíveis pela CEB. Não representam o consumo total faturável dos provedores.</p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
      <button type="button" disabled={loading} onClick={()=>void refresh()}>{loading?'Atualizando…':'Atualizar dados'}</button>
      <button type="button" disabled={!snapshot||loading} onClick={downloadCsv}>Exportar CSV</button>
    </div>
    {error&&<p role="alert">{error}</p>}
    {snapshot&&<><p><small>Última consulta: {snapshot.fetchedAt}. Valores de arquivos são a soma dos tamanhos registrados na biblioteca; arquivos reutilizados podem aparecer em mais de um cartão sem ocupar espaço adicional.</small></p>
      <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
        <Metric name="Arquivos na biblioteca" value={formatNumber(files.length)} detail={`PDF: ${pdf} · HTML: ${html} · Word: ${docx}`}/>
        <Metric name="Tamanho dos arquivos listados" value={formatBytes(bytes)} detail="Não inclui overhead, banco de dados nem objetos não listados"/>
        <Metric name="Estudos acessíveis" value={formatNumber(snapshot.studies)}/>
        <Metric name="Tempo de consulta à API" value={`${formatNumber(snapshot.responseMs)} ms`} detail="Tempo total das três consultas autenticadas, medido neste navegador"/>
        <Metric name="Usuários ativos" value={formatNumber(snapshot.users.filter(u=>u.is_active).length)} detail={`Total cadastrado: ${snapshot.users.length}`}/>
      </div>
    </>}
    {snapshot&&<>
      <h3>Distribuição dos materiais</h3>
      <p><small>Gráfico baseado apenas nos arquivos registrados e acessíveis pela CEB.</small></p>
      {types.map(t=><div key={t.name} style={{marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12}}><strong>{t.name}</strong><span>{formatNumber(t.count)} arquivos · {formatBytes(t.bytes)}</span></div>
        <div role="meter" aria-label={t.name} aria-valuemin={0} aria-valuemax={Math.max(1,files.length)} aria-valuenow={t.count} style={{height:12,background:'#e9eef5',borderRadius:8,overflow:'hidden'}}>
          <div style={{height:'100%',width:(files.length?100*t.count/files.length:0)+'%',background:'#2563a6'}}/>
        </div>
      </div>)}
      <h3>Novos arquivos — últimos 14 dias</h3>
      <div role="img" aria-label="Gráfico de novos arquivos cadastrados por dia" style={{display:'flex',alignItems:'end',height:130,gap:5,borderBottom:'1px solid #a9b6c5'}}>
        {daily.map(d=><div key={d.day} title={d.day+': '+d.count+' arquivos'} style={{flex:1,minWidth:4,height:Math.max(3,d.count/peak*120),background:'#2563a6',borderRadius:'3px 3px 0 0'}}/>)}
      </div>
      <p><small>Da esquerda para a direita: {days[0]} a {days[13]}. Esse gráfico mostra cadastros, não consumo faturável nem downloads.</small></p>
    </>}
    <h3>Serviços vinculados à CEB</h3>
    <p><small>Identificação conferida na conta Cloudflare em 30/10/2026. Isto não é uma leitura automática de consumo ou disponibilidade.</small></p>
    <div style={{display:'grid',gap:8,marginBottom:16}}>
      <article style={{border:'1px solid #d8e2ef',padding:12,borderRadius:8}}><strong>Worker oficial:</strong> <code>ceb-biblioteca-api</code><p>Encontrado na conta Cloudflare. Consumo e erros: aguardando integração de métricas.</p></article>
      <article style={{border:'1px solid #d8e2ef',padding:12,borderRadius:8}}><strong>Worker de validação:</strong> <code>ceb-biblioteca-api-validacao</code><p>Encontrado na conta Cloudflare. Monitoramento separado da produção.</p></article>
    </div>
    <h3>Monitoramento por provedor</h3>
    <p>As métricas abaixo exigem conexão autenticada de leitura com os provedores. Até lá, o consumo, a franquia, o percentual e o custo real ficam <strong>indisponíveis</strong>.</p>
    <div style={{display:'grid',gap:10}}>
      {providers.map(p=><article key={p.name} style={{border:'1px solid #d8e2ef',borderRadius:10,padding:12}}>
        <strong>{p.name}</strong><p style={{margin:'6px 0'}}>{p.metrics}</p>
        <p style={{margin:'6px 0'}}>Consumo: <strong>Não conectado</strong> · Limite: <strong>Não consultado</strong></p>
        <a href={p.url} target="_blank" rel="noopener noreferrer">Abrir painel oficial</a>
      </article>)}
    </div>
    <p><small>Diagnóstico de acesso: a conexão Cloudflare usada na verificação não permite consultar faturamento (permissão Billing Read necessária). A consulta R2 informou que o serviço não está habilitado nessa conta. Não habilite serviços nem forneça tokens no navegador para alimentar este painel.</small></p>
    <h3>Controle de custos e alertas</h3>
    <p><strong>Custo mensal verificado: indisponível.</strong> Não é possível afirmar R$ 0,00 sem consultar a cobrança dos provedores.</p>
    <p>Alertas em 70%, 85% e 95% serão calculados somente após conectar consumo e limite reais de cada serviço. O painel não altera planos, cobranças ou bloqueios dos provedores.</p>

    <p><small>Este painel é exclusivo da Administração. Não armazena credenciais nem modifica limites ou dados.</small></p>
    </div>}
  </section>
}
