import type { Role } from '../types'

export const roleHome: Record<Role, string> = {
  patient: '/patient/dashboard',
  doctor: '/doctor/dashboard',
  admin: '/admin/dashboard',
}

const authPaths = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
])

export function safeRedirect(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value, window.location.origin)
    if (url.origin !== window.location.origin) return null
    const path = `${url.pathname}${url.search}${url.hash}`
    if (authPaths.has(url.pathname)) return null
    return path
  } catch {
    return null
  }
}

export function resolvePostLoginPath(
  role: Role,
  redirect: string | null,
): string {
  const safe = safeRedirect(redirect)
  if (!safe) return roleHome[role]
  const owner = safe.match(/^\/(patient|doctor|admin)(?:\/|$)/)?.[1]
  if (owner && owner !== role) return roleHome[role]
  return safe
}
