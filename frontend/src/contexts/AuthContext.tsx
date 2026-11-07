import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  ApiError,
  SESSION_EXPIRED_EVENT,
  apiErrorMessage,
  apiRequest,
  clearStoredSession,
  getStoredSession,
  storeSession,
  toSessionUser,
  type ApiAuthResponse,
  type ApiUser,
} from '../lib/api'
import { roleHome } from '../lib/auth'
import type { Gender, Role, SessionUser } from '../types'

interface RegisterInput {
  name: string
  email: string
  password: string
  phone: string
  dob: string
  gender: Gender
  address: string
}

interface AuthResult {
  ok: boolean
  message: string
  user?: SessionUser
}

interface AuthContextValue {
  user: SessionUser | null
  login: (email: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
  registerPatient: (input: RegisterInput) => Promise<AuthResult>
  requestPasswordReset: (email: string) => Promise<AuthResult>
  resetPassword: (
    email: string,
    token: string,
    next: string,
  ) => Promise<AuthResult>
  updateProfile: (patch: {
    name?: string
    phone?: string
    photoUrl?: string
  }) => Promise<AuthResult>
  changePassword: (current: string, next: string) => Promise<AuthResult>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function storedUser(): SessionUser | null {
  const session = getStoredSession()
  return session ? toSessionUser(session.user) : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(storedUser)

  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    apiRequest<ApiUser>('/Auth/me')
      .then((profile) => {
        if (cancelled) return
        const session = getStoredSession()
        if (session) storeSession({ ...session, user: profile })
        setUser(toSessionUser(profile))
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          clearStoredSession()
          setUser(null)
        }
      })

    return () => {
      cancelled = true
    }
    // Revalidate once per signed-in user, not after local profile updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const login: AuthContextValue['login'] = async (email, password) => {
    try {
      const response = await apiRequest<ApiAuthResponse>('/Auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
        auth: false,
        retry: false,
      })
      storeSession(response)
      const sessionUser = toSessionUser(response.user)
      setUser(sessionUser)
      return {
        ok: true,
        message: `Signed in as ${sessionUser.name}.`,
        user: sessionUser,
      }
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error) }
    }
  }

  const logout: AuthContextValue['logout'] = async () => {
    const session = getStoredSession()
    if (session) {
      try {
        await apiRequest<undefined>('/Auth/logout', {
          method: 'POST',
          body: { refreshToken: session.refreshToken },
        })
      } catch {
        // Local sign-out must succeed even when the server is unreachable.
      }
    }
    clearStoredSession()
    setUser(null)
  }

  const registerPatient: AuthContextValue['registerPatient'] = async (input) => {
    try {
      await apiRequest<ApiUser>('/Auth/register', {
        method: 'POST',
        body: {
          name: input.name.trim(),
          email: input.email.trim(),
          password: input.password,
          phone: input.phone.trim(),
          dateOfBirth: input.dob,
          gender: input.gender,
          address: input.address.trim(),
        },
        auth: false,
        retry: false,
      })
      return {
        ok: true,
        message: 'Your account is ready. Sign in to book your first visit.',
      }
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error) }
    }
  }

  const requestPasswordReset: AuthContextValue['requestPasswordReset'] = async (
    email,
  ) => {
    try {
      const response = await apiRequest<{ message: string }>(
        '/Auth/forgot-password',
        {
          method: 'POST',
          body: { email: email.trim() },
          auth: false,
          retry: false,
        },
      )
      return { ok: true, message: response.message }
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error) }
    }
  }

  const resetPassword: AuthContextValue['resetPassword'] = async (
    email,
    token,
    next,
  ) => {
    try {
      const response = await apiRequest<{ message: string }>(
        '/Auth/reset-password',
        {
          method: 'POST',
          body: { email: email.trim(), token, newPassword: next },
          auth: false,
          retry: false,
        },
      )
      return { ok: true, message: response.message }
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error) }
    }
  }

  const updateProfile: AuthContextValue['updateProfile'] = async (patch) => {
    if (!user) {
      return { ok: false, message: 'Sign in before updating your profile.' }
    }

    try {
      const profile = await apiRequest<ApiUser>('/Auth/me', {
        method: 'PUT',
        body: {
          name: patch.name,
          phone: patch.phone,
          photoUrl: patch.photoUrl,
        },
      })
      const session = getStoredSession()
      if (session) storeSession({ ...session, user: profile })
      const updated = toSessionUser(profile)
      setUser(updated)
      return { ok: true, message: 'Profile updated.', user: updated }
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error) }
    }
  }

  const changePassword: AuthContextValue['changePassword'] = async (
    current,
    next,
  ) => {
    if (!user) {
      return { ok: false, message: 'Sign in before changing your password.' }
    }

    try {
      const response = await apiRequest<{ message: string }>(
        '/Auth/change-password',
        {
          method: 'POST',
          body: { currentPassword: current, newPassword: next },
        },
      )
      return { ok: true, message: response.message }
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error) }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        registerPatient,
        requestPasswordReset,
        resetPassword,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}

export function getRoleHome(role: Role): string {
  return roleHome[role]
}
