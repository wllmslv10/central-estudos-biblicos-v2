// Decode the approved self-contained offline HTML wrapper for text reading only.
// Never execute imported scripts. The original HTML remains unchanged for preview/download.
export function unwrapOfflinePresentation(html) {
  if (typeof html !== 'string' || html.length > 16_000_000) return html;
  const marker = /\b(?:const|let|var)\s+SOURCE_B64\s*=\s*["']([A-Za-z0-9+/=]+)["']/;
  const match = marker.exec(html);
  if (!match || match[1].length > 12_000_000) return html;
  try {
    const binary = atob(match[1]);
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    const decoded = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    return /<html\b|<!doctype\s+html/i.test(decoded) ? decoded : html;
  } catch {
    return html;
  }
}
