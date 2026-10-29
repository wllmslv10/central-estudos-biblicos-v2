const API_BASE = 'https://ceb-biblioteca-api.wllmslv10.workers.dev'

export type CebUser = {
  id: string
  username: string
  display_name: string
  role: 'user' | 'admin'
  must_change_password: boolean
}

export type CloudStudy = {
  id: string
  owner_user_id: string
  title: string
  content: Record<string, unknown>
  visibility: 'private' | 'shared'
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
  quiz_available?: boolean
  quiz_summary?: { reviewed: boolean; questionCount: number } | null
}

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown; token?: string }

export async function cebApi<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, token, headers: suppliedHeaders, ...rest } = options
  const headers = new Headers(suppliedHeaders)
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'omit',
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error || `Falha na API (${response.status}).`)
  return payload
}

export async function loginCeb(username: string, password: string) {
  return cebApi<{ user: CebUser; access_token: string; token_type: 'Bearer'; expires_at: string }>(
    '/auth/login',
    { method: 'POST', body: { username, password } },
  )
}
export async function getCebSession(token: string) {
  return cebApi<{ user: CebUser }>('/auth/me', { token })
}
export async function logoutCeb(token: string) {
  return cebApi<{ ok: boolean }>('/auth/logout', { method: 'POST', token })
}
export async function changeCebPassword(token: string, currentPassword: string, newPassword: string) {
  return cebApi<{ ok: boolean; user: CebUser }>('/auth/change-password', {
    method: 'POST', token, body: { current_password: currentPassword, new_password: newPassword },
  })
}
export async function listCloudStudies(token: string) {
  return cebApi<{ studies: CloudStudy[] }>('/studies', { token })
}
export async function createCloudStudy(
  token: string,
  study: Pick<CloudStudy, 'title' | 'content'> & Partial<Pick<CloudStudy, 'visibility' | 'status'>>,
) {
  return cebApi<{ study: CloudStudy }>('/studies', { method: 'POST', token, body: study })
}
export async function updateCloudStudy(
  token: string,
  id: string,
  study: Pick<CloudStudy, 'title' | 'content'> & Partial<Pick<CloudStudy, 'visibility' | 'status'>>,
) {
  return cebApi<{ study: CloudStudy }>(`/studies/${encodeURIComponent(id)}`, {
    method: 'PUT', token, body: study,
  })
}
export async function deleteCloudStudy(token: string, id: string) {
  return cebApi<{ ok: boolean }>(`/studies/${encodeURIComponent(id)}`, {
    method: 'DELETE', token,
  })
}

export type ImportCategory = 'estudo' | 'esboco' | 'ebd-licao' | 'ebd-manual' | 'ebd-apresentacao' | 'ebd-apoio'
export type CloudFolder = { id: string; name: string; scope: 'private' | 'general'; owner_user_id: string }
export type CloudMaterial = {
  id: string; owner_user_id: string; title: string; filename: string; mime_type: string;
  byte_size: number; extracted_text: string; kind: 'estudo' | 'esboco'; category?: ImportCategory; scope: 'private' | 'general';
  folder: string | null; applied: boolean; applied_date: string | null; created_at: string;
}
export const libraryCapabilities = (token: string) => cebApi<{ uploads: boolean; material_categories?: boolean }>('/library/capabilities', { token })
export const cloudFolders = (token: string) => cebApi<{ folders: CloudFolder[] }>('/library/folders', { token })
export const createCloudFolder = (token: string, name: string, scope: string) => cebApi<{ folder: CloudFolder }>('/library/folders', { method: 'POST', token, body: { name, scope } })
export const cloudMaterials = (token: string, trash = false) => cebApi<{ materials: CloudMaterial[] }>(`/library/materials${trash ? '?trash=1' : ''}`, { token })
export async function uploadCloudMaterial(token: string, file: File, metadata: Record<string, unknown>) {
  const form = new FormData(); form.append('file', file); form.append('metadata', JSON.stringify(metadata))
  const response = await fetch(`${API_BASE}/library/materials`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, credentials: 'omit', cache: 'no-store' })
  const payload = await response.json() as { material: CloudMaterial; error?: string }
  if (!response.ok) throw new Error(payload.error || 'O upload não foi concluído.')
  return payload
}
export async function downloadCloudMaterial(token: string, id: string) {
  const r = await fetch(`${API_BASE}/library/materials/${encodeURIComponent(id)}/download`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', cache: 'no-store' })
  if (!r.ok) throw new Error('Não foi possível baixar o original. Verifique sua sessão e as permissões.')
  return r.blob()
}
export const patchCloudMaterial = (token: string, id: string, applied: boolean, applied_date: string) => cebApi<{ ok: boolean }>(`/library/materials/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: { applied, applied_date } })
export const trashCloudMaterial = (token: string, id: string) => cebApi<{ ok: boolean }>(`/library/materials/${encodeURIComponent(id)}`, { method: 'DELETE', token })
export const restoreCloudMaterial = (token: string, id: string) => cebApi<{ ok: boolean }>(`/library/materials/${encodeURIComponent(id)}/restore`, { method: 'POST', token })
export const restoreCloudStudy = (token: string, id: string) => cebApi<{ ok: boolean }>(`/studies/${encodeURIComponent(id)}/restore`, { method: 'POST', token })
export const patchCloudStudyApplication = (token: string, id: string, applied: boolean, applied_date: string) => cebApi<{ ok: boolean }>(`/studies/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: { applied, applied_date } })
