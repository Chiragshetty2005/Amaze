import type { Role, SessionUser } from '../types'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
).replace(/\/+$/, '')
const AUTH_STORAGE_KEY = 'amazecare-api-session-v1'

export const SESSION_EXPIRED_EVENT = 'amazecare:session-expired'

export interface ApiUser {
  id: string
  role: string
  name: string
  email: string
  phone: string
  photoUrl?: string | null
}

export interface ApiAuthResponse {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  user: ApiUser
}

export type StoredSession = ApiAuthResponse

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string[]>

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export function toSessionUser(user: ApiUser): SessionUser {
  return {
    id: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    photoUrl: user.photoUrl ?? undefined,
  }
}

export function getStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredSession> | null
    if (
      !parsed?.accessToken ||
      !parsed.refreshToken ||
      !parsed.user?.id ||
      !parsed.user.role
    ) {
      return null
    }
    return parsed as StoredSession
  } catch {
    return null
  }
}

export function storeSession(session: StoredSession): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // A read-only storage area should not block an otherwise valid session.
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export function notifySessionExpired(): void {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

let refreshInFlight: Promise<StoredSession | null> | null = null

async function parseProblem(response: Response): Promise<ApiError> {
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // Non-JSON responses are handled below.
  }

  const problem =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : null
  const fieldErrors =
    problem?.errors && typeof problem.errors === 'object'
      ? (problem.errors as Record<string, string[]>)
      : {}

  let message = ''
  if (typeof problem?.detail === 'string') message = problem.detail
  else if (typeof problem?.message === 'string') message = problem.message
  else if (typeof problem?.title === 'string') message = problem.title

  if (!message) {
    if (response.status === 401) {
      message = 'Your session has expired. Please sign in again.'
    } else if (response.status === 403) {
      message = 'You do not have permission to perform this action.'
    } else {
      message = `Request failed (${response.status}).`
    }
  }

  return new ApiError(message, response.status, fieldErrors)
}

async function refreshSession(): Promise<StoredSession | null> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const current = getStoredSession()
    if (!current?.refreshToken) return null

    try {
      const response = await fetch(`${API_BASE_URL}/Auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      })

      if (!response.ok) {
        clearStoredSession()
        notifySessionExpired()
        return null
      }

      const session = (await response.json()) as ApiAuthResponse
      storeSession(session)
      return session
    } catch {
      clearStoredSession()
      notifySessionExpired()
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  retry?: boolean
  signal?: AbortSignal
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    auth = true,
    retry = true,
    signal,
  } = options

  const perform = async (token?: string): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`
    return fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  }

  const session = auth ? getStoredSession() : null
  let response = await perform(session?.accessToken)

  if (response.status === 401 && auth && retry && session?.refreshToken) {
    const refreshed = await refreshSession()
    if (refreshed) {
      response = await perform(refreshed.accessToken)
    }
  }

  if (!response.ok) {
    throw await parseProblem(response)
  }

  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.text()) as T
}

export async function apiDownload(
  path: string,
  fileName: string,
): Promise<void> {
  const session = getStoredSession()
  const perform = (token?: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })

  let response = await perform(session?.accessToken)
  if (response.status === 401 && session?.refreshToken) {
    const refreshed = await refreshSession()
    if (refreshed) response = await perform(refreshed.accessToken)
  }

  if (!response.ok) {
    throw await parseProblem(response)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const firstFieldError = Object.values(error.fieldErrors)[0]?.[0]
    return firstFieldError || error.message
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

export function formatApiValidationErrors(
  error: unknown,
): Record<string, string> {
  if (!(error instanceof ApiError)) return {}
  const result: Record<string, string> = {}
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if (messages.length > 0) {
      result[field.charAt(0).toLowerCase() + field.slice(1)] = messages[0]
    }
  }
  return result
}
