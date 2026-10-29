import { useRef, useState } from 'react'
import { runUploadProbe } from './uploadProbeRunner'
export default function UploadProbePanel({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [spent, setSpent] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const started = useRef(false)
  async function run() {
    if (started.current) return
    started.current = true
    setBusy(true); setSpent(true); setMessages([])
    try { await runUploadProbe(token, message => setMessages(current=>[...current,message])) }
    finally { setBusy(false) }
  }
  return <section aria-label="Validação temporária da importação">
    <button type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>🧪 Teste administrativo temporário de importação</button>
    {open && <div>
      <p>Somente quatro arquivos técnicos incorporados ao teste. Nenhum material da Biblioteca será alterado. O upload geral permanece desativado.</p>
      <p>Execute uma única vez, quando a janela tiver sido liberada pelo responsável. Não é necessário informar senha ou token.</p>
      <button type="button" disabled={busy || spent} onClick={()=>void run()}>{busy ? 'Validando pelo Worker…' : spent ? 'Execução encerrada' : 'Executar teste dos quatro arquivos'}</button>
      <div role="status" aria-live="polite" aria-busy={busy}>{messages.map((message,index)=><p key={index}>{message}</p>)}</div>
    </div>}
  </section>
}
