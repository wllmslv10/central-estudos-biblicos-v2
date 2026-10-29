import fixtures from './uploadProbeFixtures.json'
const API = 'https://ceb-biblioteca-api.wllmslv10.workers.dev'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export async function runUploadProbe(token: string, report: (message: string) => void, transport: typeof fetch = fetch) {
  let stage = 'autenticação'
  const request = async (path: string, method = 'GET', bytes?: Uint8Array, authenticated = true) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      return await transport(API + path, { method, headers: authenticated ? { Authorization: `Bearer ${token}` } : {},
        ...(bytes ? {body: bytes as BodyInit} : {}), credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal })
    } finally { clearTimeout(timeout) }
  }
  const digest = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))].map(b=>b.toString(16).padStart(2,'0')).join('')
  try {
    const me = await request('/auth/me')
    if (me.status !== 200) throw new Error()
    const {user} = await me.json()
    if (user?.role !== 'admin' || user?.must_change_password) throw new Error()
    report('Perfil administrativo confirmado pelo servidor.')
    stage = 'janela de teste'
    const status = await request('/library/_upload-probe')
    if (status.status !== 200) throw new Error()
    const config = await status.json()
    if (!UUID.test(config.run) || config.uploads_enabled !== false || !Number.isFinite(Date.parse(config.end)) || Date.parse(config.end) <= Date.now() || !Array.isArray(config.files) || config.files.length !== 4) throw new Error()
    const root = '/library/_upload-probe/' + config.run
    // Validate the whole manifest before the first write.
    const originals = []
    for (const file of fixtures) {
      const matches = config.files.filter((f: {format: string})=>f.format === file.format)
      const bytes = Uint8Array.from(atob(file.base64),c=>c.charCodeAt(0))
      if (matches.length !== 1 || matches[0].sha256 !== file.sha256 || matches[0].bytes !== file.bytes || bytes.length !== file.bytes || await digest(bytes) !== file.sha256) throw new Error()
      originals.push({file,bytes})
    }
    for (const {file,bytes} of originals) {
      stage = file.format.toUpperCase() + ': acesso anônimo'
      const path = root + '/' + file.format
      const anonymous = await request(path, 'GET', undefined, false)
      if (![401,403].includes(anonymous.status)) throw new Error()
      stage = file.format.toUpperCase() + ': envio'
      const put = await request(path,'PUT',bytes)
      if (put.status !== 201) throw new Error()
      stage = file.format.toUpperCase() + ': proteção contra sobrescrita'
      const duplicate = await request(path,'PUT',bytes)
      if (duplicate.status !== 409) throw new Error()
      stage = file.format.toUpperCase() + ': recuperação e integridade'
      const get = await request(path)
      if (get.status !== 200) throw new Error()
      const recovered = new Uint8Array(await get.arrayBuffer())
      if (recovered.length !== file.bytes || await digest(recovered) !== file.sha256) throw new Error()
      report(file.format.toUpperCase() + ': envio, recuperação, integridade e bloqueios aprovados.')
    }
    report('Teste concluído. A remoção do painel e da exceção ainda deve ser confirmada pelo responsável pela implantação.')
    return true
  } catch {
    // Technical stage only: never propagate response bodies, exceptions or secrets.
    report('Teste interrompido na etapa: ' + stage + '. Não repita o teste; informe somente esta mensagem.')
    return false
  }
}
