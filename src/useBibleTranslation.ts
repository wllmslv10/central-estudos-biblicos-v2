import {useEffect,useState,type RefObject} from 'react'
import {bibleTranslations,normalizeBibleTranslation,preferredBibleTranslation} from './bibleTranslations.mjs'

const key = 'ceb-bible-translation'
const changed = 'ceb-bible-translation-changed'

export function chooseBibleTranslation(value: string) {
  if (!Object.hasOwn(bibleTranslations,value)) return
  try { localStorage.setItem(key,value) } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent(changed,{detail:value}))
}

export function useBibleTranslation(frame?: RefObject<HTMLIFrameElement|null>) {
  const [translation,setTranslation] = useState(preferredBibleTranslation)
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) setTranslation(normalizeBibleTranslation(event.newValue))
    }
    const onChange = (event: Event) => setTranslation(normalizeBibleTranslation((event as CustomEvent).detail))
    const onMessage = (event: MessageEvent) => {
      if (frame?.current && event.source === frame.current.contentWindow && event.data?.type === 'ceb-reading-translation') {
        chooseBibleTranslation(event.data.value)
      }
    }
    window.addEventListener('storage',onStorage)
    window.addEventListener(changed,onChange)
    window.addEventListener('message',onMessage)
    return () => {
      window.removeEventListener('storage',onStorage)
      window.removeEventListener(changed,onChange)
      window.removeEventListener('message',onMessage)
    }
  },[frame])
  const sync = () => frame?.current?.contentWindow?.postMessage({type:'ceb-set-translation',value:translation},'*')
  useEffect(sync,[frame,translation])
  return {translation,sync}
}
