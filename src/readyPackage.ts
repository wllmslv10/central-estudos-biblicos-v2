import { BlobReader, ZipReader } from '@zip.js/zip.js'
import { parseImportedQuiz } from './Quiz'

const MiB = 1024 * 1024
const roles = {
  presentation: ['.html', 'text/html', 'Apresentação'],
  reading: ['.html', 'text/html', 'Leitura Interativa'],
  sermonOutline: ['.html', 'text/html', 'Esboço completo'],
  sermonPulpit: ['.html', 'text/html', 'Roteiro de púlpito'],
  pdf: ['.pdf', 'application/pdf', 'PDF integral'],
  quizHtml: ['.html', 'text/html', 'Questionário HTML (privado)'],
  quizData: ['.json', 'application/json', 'Questões para revisão'],
} as const
type Role = keyof typeof roles
const safeName = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,119}$/

export async function readReadyPackage(zip: File) {
  if (!zip.size || zip.size > 40 * MiB) throw Error('O pacote ZIP deve ter até 40 MB.')
  const reader = new ZipReader(new BlobReader(zip))
  try {
    const entries = new Map<string, Awaited<ReturnType<typeof reader.getEntries>>[number]>()
    let total = 0
    for await (const entry of reader.getEntriesGenerator()) {
      if (entries.size >= 6 || entry.directory || entry.encrypted || !safeName.test(entry.filename) || entries.has(entry.filename.toLowerCase()) ||
          (entry.unixMode != null && (entry.unixMode & 0xf000) !== 0 && (entry.unixMode & 0xf000) !== 0x8000) ||
          entry.uncompressedSize <= 0 || entry.uncompressedSize > 20 * MiB) throw Error('O ZIP contém entradas inválidas, repetidas ou acima do limite.')
      total += entry.uncompressedSize
      if (total > 40 * MiB) throw Error('O conteúdo descompactado excede 40 MB.')
      entries.set(entry.filename.toLowerCase(), entry)
    }
    async function extract(name: string, limit: number) {
      const entry = entries.get(name.toLowerCase())
      if (!entry || entry.filename !== name || entry.directory || entry.uncompressedSize > limit) throw Error('Arquivo ausente ou inválido: '+name)
      const chunks: Uint8Array<ArrayBuffer>[] = []
      let size = 0
      await entry.getData(new WritableStream<Uint8Array>({
        write(chunk) {
          size += chunk.byteLength
          if (size > limit || size > entry!.uncompressedSize) throw Error('O arquivo ultrapassou o tamanho declarado.')
          chunks.push(new Uint8Array(chunk))
        },
      }), {checkSignature:true, useWebWorkers:false})
      if (size !== entry.uncompressedSize) throw Error('Tamanho incorreto: '+name)
      return new Blob(chunks)
    }
    const manifest = JSON.parse(await (await extract('manifest.json', 32 * 1024)).text()) as Record<string,unknown>
    if (manifest?.version !== 1 || !manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) throw Error('Manifesto de pacote IBNE v1 inválido.')
    const field = (key: string, max: number, required = false) => {
      const value = manifest[key] ?? ''
      if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw Error('Metadado inválido: '+key)
      return value.trim()
    }
    const used = new Set(['manifest.json'])
    const files: {file:File; label:string}[] = []
    let quizText = ''
    for (const [key,name] of Object.entries(manifest.files)) {
      if (!Object.hasOwn(roles,key) || typeof name !== 'string' || !safeName.test(name) || used.has(name.toLowerCase())) throw Error('Papel ou nome de arquivo inválido no manifesto.')
      const [suffix,mime,label] = roles[key as Role]
      if (!name.toLowerCase().endsWith(suffix)) throw Error('Extensão incompatível: '+name)
      used.add(name.toLowerCase())
      const blob = await extract(name, key === 'quizData' ? 256 * 1024 : 20 * MiB)
      if (key === 'quizData') {
        quizText = await blob.text()
        parseImportedQuiz(quizText)
      } else {
        const prefix = (await blob.slice(0,1024).text()).trimStart()
        if (suffix === '.pdf' ? !prefix.startsWith('%PDF-') : !/^\s*(?:<!doctype\s+html\b|<html\b)/i.test(prefix)) throw Error('Conteúdo incompatível: '+name)
        files.push({file:new File([blob],name,{type:mime}),label})
      }
    }
    if (used.size !== entries.size || !files.length) throw Error('Declare todos os arquivos e inclua pelo menos um HTML ou PDF.')
    return {title:field('title',240,true),description:field('description',2000),theme:field('theme',1000),references:field('references',1000),files,quizText}
  } finally { await reader.close() }
}
