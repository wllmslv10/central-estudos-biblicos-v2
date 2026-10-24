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
export async function changeCebPassword(token: string, newPassword: string) {
  return cebApi<{ ok: boolean; user: CebUser }>('/auth/change-password', {
    method: 'POST', token, body: { new_password: newPassword },
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
