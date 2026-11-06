import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getRoleHome, useAuth } from '../../contexts/AuthContext'
import type { Role } from '../../types'

export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    const redirect = `${location.pathname}${location.search}`
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    )
  }

  if (user.role !== role) {
    return <Navigate to={getRoleHome(user.role)} replace />
  }

  return <Outlet />
}
