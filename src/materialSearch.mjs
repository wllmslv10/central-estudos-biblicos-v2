export function normalizeSearch(value) {
  return String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

// Search only records already returned by the authenticated API. No remote search or writes.
export function matchesMaterial(query, fields) {
  const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  const text = normalizeSearch(fields.filter(Boolean).join(' '));
  return terms.every(term => text.includes(term));
}
