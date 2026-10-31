import { useCallback, useEffect, useState } from 'react'
import { cebApi, cloudMaterials, listCloudStudies, type CloudMaterial } from './cebApi'

type User = { id: string; is_active: boolean; app_role: string }
type Snapshot = { files: CloudMaterial[]; studies: number; users: User[]; fetchedAt: string }
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
  const refresh = useCallback(async () => {
    setLoading(true);setError('')
    try {
      const [materials,studies,users] = await Promise.all([
        cloudMaterials(token),listCloudStudies(token),cebApi<{users:User[]}>('/admin/users',{token})
      ])
      setSnapshot({files:materials.materials,studies:studies.studies.length,users:users.users,fetchedAt:new Date().toLocaleString('pt-BR')})
    } catch(e) {setError(e instanceof Error?e.message:'Não foi possível consultar o consumo.')}
    finally {setLoading(false)}
  },[token])
  useEffect(()=>{void refresh()},[refresh])
  const files = snapshot?.files ?? []
  const bytes = files.reduce((sum,f)=>sum+(Number.isFinite(Number(f.byte_size))?Math.max(0,Number(f.byte_size)):0),0)
  const pdf = files.filter(f=>f.mime_type==='application/pdf').length
  const html = files.filter(f=>/html/i.test(f.mime_type)).length
  const docx = files.filter(f=>/wordprocessingml|msword/i.test(f.mime_type)).length
  const downloadCsv = () => {
    if(!snapshot)return
    const lines = [['indicador','valor'],['arquivos',files.length],['bytes_arquivos_listados',bytes],['pdf',pdf],['html',html],['word',docx],['estudos_visiveis',snapshot.studies],['usuarios_ativos',snapshot.users.filter(u=>u.is_active).length]]
    const csv='\uFEFF'+lines.map(row=>row.join(';')).join('\r\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    const link=document.createElement('a');link.href=url;link.download='ceb-consumo.csv';link.click();URL.revokeObjectURL(url)
  }
  return <section aria-label="Consumo e armazenamento" style={{marginTop:18}}>
    <h2>📊 Consumo e armazenamento</h2>
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
        <Metric name="Usuários ativos" value={formatNumber(snapshot.users.filter(u=>u.is_active).length)} detail={`Total cadastrado: ${snapshot.users.length}`}/>
      </div>
    </>}
    <h3>Limites dos provedores</h3>
    <p><strong>Neon (banco e armazenamento), Cloudflare Workers, armazenamento de objetos e Workers AI:</strong> consumo total e franquia atual não disponíveis nesta consulta. Consulte os painéis oficiais antes de considerar qualquer percentual ou saldo.</p>
    <p><strong>Alertas de 70%, 85% e 95%:</strong> serão habilitados quando a CEB receber dados oficiais de uso e limites; nenhum alerta é calculado com valores estimados.</p>
    <p><small>Este painel é exclusivo da Administração. Não armazena credenciais nem modifica limites ou dados.</small></p>
  </section>
}
