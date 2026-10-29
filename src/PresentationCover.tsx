import { useState } from 'react'
import type { PresentationCover as Cover } from './presentation.mjs'
import ebdCover from './ebd-presentation-cover.png?inline'

// Presentation-only settings: no writes to the lesson or its Library record.
export const defaultPresentationCover = (collection?: string): Cover | null => collection === 'ebd' ? { src: ebdCover, alt: 'Escola Bíblica — Igreja Batista Nova Esperança — William Silva' } : null
export default function PresentationCover({ value, onChange }: { value: Cover | null; onChange: (cover: Cover | null) => void }) {
  const [error, setError] = useState('')
  async function choose(file?: File) {
    if (!file) return
    setError('')
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Escolha uma imagem PNG, JPEG ou WebP de até 5 MB.'); return }
    try {
      const src = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
      const image = new Image(); image.src = src; await image.decode()
      onChange({ src, alt: 'Capa da apresentação' })
    } catch { setError('Não foi possível abrir a imagem. A capa anterior foi preservada.') }
  }
  return <details className="presentation-cover-settings"><summary>Capa da apresentação{value ? ' · incluída como primeiro slide' : ' · opcional'}</summary><label>Imagem de capa<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { void choose(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>{value && <button type="button" className="secondary-button" onClick={() => onChange(null)}>Sem capa</button>}<small>A imagem fica inteira, sem deformação. Esta escolha é incluída na prévia e no HTML baixado; não modifica a lição salva.</small>{error && <p role="alert">{error}</p>}</details>
}
