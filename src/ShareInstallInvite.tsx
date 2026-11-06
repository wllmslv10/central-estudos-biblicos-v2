import { useState } from 'react'

export const CEB_INSTALL_URL = 'https://ceb.ibne.workers.dev/central-estudos-biblicos-v2/instalar.html'
export const CEB_ACCESS_URL = 'https://ceb.ibne.workers.dev/'

export function installationInvitation(name: string, username: string) {
  return [
    'Olá, ' + name + '! Seu acesso à Central de Estudos Bíblicos (CEB) da Igreja Batista Nova Esperança está disponível.',
    '',
    'Instale a CEB: ' + CEB_INSTALL_URL,
    'Acesse a CEB: ' + CEB_ACCESS_URL,
    'Seu usuário: ' + username,
    '',
    'Android: abra o link de instalação no Chrome e escolha Instalar aplicativo ou Adicionar à tela inicial.',
    'iPhone: abra o link no Safari e escolha Compartilhar > Adicionar à Tela de Início.',
    'Computador: abra o link no Chrome ou Edge e escolha Instalar aplicativo.',
    '',
    'Sua senha deve ser informada separadamente, por um canal seguro.'
  ].join('\n')
}

export default function ShareInstallInvite({ name, username, onWhatsApp, onClose }: {
  name: string; username: string; onWhatsApp: (message: string) => void; onClose: () => void
}) {
  const [status, setStatus] = useState('')
  const message = installationInvitation(name, username)
  const email = () => {
    window.location.href = 'mailto:?subject=' + encodeURIComponent('Instalação e acesso à CEB IBNE') + '&body=' + encodeURIComponent(message)
    setStatus('O aplicativo de e-mail será aberto para você escolher o destinatário e enviar.')
  }
  const share = async () => {
    if (!navigator.share) { setStatus('Compartilhamento do dispositivo indisponível. Use Copiar link.'); return }
    try { await navigator.share({ title: 'Instalar CEB IBNE', text: message, url: CEB_INSTALL_URL }); setStatus('Compartilhamento concluído no dispositivo.') }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setStatus('Não foi possível compartilhar. Use Copiar link.') }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(CEB_INSTALL_URL); setStatus('Link oficial do instalador copiado.') }
    catch { setStatus('Não foi possível copiar automaticamente. Selecione o endereço abaixo.') }
  }
  return <div role="dialog" aria-label={'Compartilhar instalador com ' + name} style={{border:'1px solid #b7cce3',borderRadius:12,padding:14,marginTop:10,background:'#f5f9ff',color:'#102744'}}>
    <strong>📤 Compartilhar instalador — {name}</strong>
    <p style={{overflowWrap:'anywhere',fontSize:14}}>Endereço oficial: <a href={CEB_INSTALL_URL} target="_blank" rel="noopener noreferrer">{CEB_INSTALL_URL}</a></p>
    <div className="ceb-admin-actions" style={{display:'flex',flexWrap:'wrap',gap:8}}>
      <button type="button" onClick={() => onWhatsApp(message)}>WhatsApp</button>
      <button type="button" onClick={email}>E-mail</button>
      <button type="button" onClick={() => void share()}>Outros aplicativos</button>
      <button type="button" onClick={() => void copy()}>Copiar link</button>
      <button type="button" onClick={onClose}>Fechar</button>
    </div>
    {status && <p role="status" style={{fontSize:13}}>{status}</p>}
    <p style={{fontSize:12}}>O convite inclui o usuário, mas nunca a senha. O envio não altera permissões de acesso.</p>
  </div>
}
