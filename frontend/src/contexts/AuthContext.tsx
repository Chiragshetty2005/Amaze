import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { adminUser } from '../mocks/data'
import { roleHome } from '../lib/auth'
import type { Gender, Role, SessionUser } from '../types'
import { useClinic } from './ClinicContext'

const SESSION_KEY = 'amazecare-session-v1'
const REGISTERED_KEY = 'amazecare-registered-v1'
const PASSWORD_KEY = 'amazecare-passwords-v1'

interface RegisteredPatient {
  name: string
  email: string
  password: string
  phone: string
  patientId: string
}

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
  login: (email: string, password: string) => AuthResult
  logout: () => void
  registerPatient: (input: RegisterInput) => AuthResult
  resetPassword: (email: string, next: string) => AuthResult
  updateProfile: (patch: {
    name?: string
    phone?: string
    photoUrl?: string
  }) => void
  changePassword: (current: string, next: string) => AuthResult
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // The demo remains usable in memory.
  }
}

function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const clinic = useClinic()
  const [user, setUser] = useState<SessionUser | null>(loadSession)

  useEffect(() => {
    if (user) {
      writeJSON(SESSION_KEY, user)
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  }, [user])

  const login: AuthContextValue['login'] = (email, password) => {
    const normalized = email.trim().toLowerCase()
    const overrides = readJSON<Record<string, string>>(PASSWORD_KEY, {})
    const registered = readJSON<RegisteredPatient[]>(REGISTERED_KEY, [])

    const expectedPassword = (fallback: string) =>
      overrides[normalized] ?? fallback

    if (
      normalized === adminUser.email &&
      password === expectedPassword(adminUser.password)
    ) {
      const session: SessionUser = {
        id: adminUser.id,
        role: 'admin',
        name: adminUser.name,
        email: adminUser.email,
        phone: adminUser.phone,
      }
      setUser(session)
      return { ok: true, message: 'Signed in as administrator.', user: session }
    }

    const doctor =
      normalized === 'doctor@amazecare.test'
        ? clinic.state.doctors[0]
        : clinic.state.doctors.find(
            (item) => item.email.toLowerCase() === normalized,
          )

    if (doctor && password === expectedPassword('Doctor@123')) {
      const session: SessionUser = {
        id: doctor.userId,
        role: 'doctor',
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        photoUrl: doctor.photoUrl,
      }
      setUser(session)
      return { ok: true, message: `Signed in as ${doctor.name}.`, user: session }
    }

    const patient =
      normalized === 'patient@amazecare.test'
        ? clinic.state.patients[0]
        : clinic.state.patients.find(
            (item) => item.email.toLowerCase() === normalized,
          )

    if (patient && password === expectedPassword('Patient@123')) {
      const session: SessionUser = {
        id: patient.userId,
        role: 'patient',
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
      }
      setUser(session)
      return {
        ok: true,
        message: `Signed in as ${patient.name}.`,
        user: session,
      }
    }

    const registeredAccount = registered.find(
      (item) => item.email.toLowerCase() === normalized,
    )
    if (registeredAccount && password === expectedPassword(registeredAccount.password)) {
      const registeredPatient = clinic.state.patients.find(
        (item) => item.id === registeredAccount.patientId,
      )
      if (registeredPatient) {
        const session: SessionUser = {
          id: registeredPatient.userId,
          role: 'patient',
          name: registeredPatient.name,
          email: registeredPatient.email,
          phone: registeredPatient.phone,
        }
        setUser(session)
        return {
          ok: true,
          message: `Signed in as ${registeredPatient.name}.`,
          user: session,
        }
      }
    }

    return {
      ok: false,
      message: 'That email and password do not match. Check both and try again.',
    }
  }

  const logout = () => {
    setUser(null)
  }

  const registerPatient: AuthContextValue['registerPatient'] = (input) => {
    const normalized = input.email.trim().toLowerCase()
    const registered = readJSON<RegisteredPatient[]>(REGISTERED_KEY, [])
    const existsInClinic = clinic.state.patients.some(
      (patient) => patient.email.toLowerCase() === normalized,
    )
    const existsInRegistered = registered.some(
      (patient) => patient.email.toLowerCase() === normalized,
    )

    if (existsInClinic || existsInRegistered) {
      return {
        ok: false,
        message: 'An account already uses that email. Try signing in instead.',
      }
    }

    const patient = clinic.addPatient({
      name: input.name.trim(),
      email: normalized,
      phone: input.phone.trim(),
      dob: input.dob,
      gender: input.gender,
      address: input.address.trim(),
    })

    registered.push({
      name: patient.name,
      email: patient.email,
      password: input.password,
      phone: patient.phone,
      patientId: patient.id,
    })
    writeJSON(REGISTERED_KEY, registered)
    return {
      ok: true,
      message: 'Your account is ready. Sign in to book your first visit.',
    }
  }

  const resetPassword: AuthContextValue['resetPassword'] = (email, next) => {
    const normalized = email.trim().toLowerCase()
    const registered = readJSON<RegisteredPatient[]>(REGISTERED_KEY, [])
    const exists =
      normalized === adminUser.email ||
      clinic.state.doctors.some(
        (doctor) => doctor.email.toLowerCase() === normalized,
      ) ||
      clinic.state.patients.some(
        (patient) => patient.email.toLowerCase() === normalized,
      ) ||
      registered.some(
        (patient) => patient.email.toLowerCase() === normalized,
      )

    if (exists) {
      const overrides = readJSON<Record<string, string>>(PASSWORD_KEY, {})
      overrides[normalized] = next
      writeJSON(PASSWORD_KEY, overrides)

      const account = registered.find(
        (patient) => patient.email.toLowerCase() === normalized,
      )
      if (account) {
        account.password = next
        writeJSON(REGISTERED_KEY, registered)
      }
    }

    return {
      ok: true,
      message:
        'If an account exists for that email, its password has been reset.',
    }
  }

  const updateProfile: AuthContextValue['updateProfile'] = (patch) => {
    if (!user) return
    setUser({ ...user, ...patch })
    if (user.role === 'patient') {
      const patient = clinic.state.patients.find(
        (item) => item.userId === user.id,
      )
      if (patient) clinic.updatePatient(patient.id, patch)
    }
    if (user.role === 'doctor') {
      const doctor = clinic.state.doctors.find(
        (item) => item.userId === user.id,
      )
      if (doctor) clinic.updateDoctor(doctor.id, patch)
    }
  }

  const changePassword: AuthContextValue['changePassword'] = (
    current,
    next,
  ) => {
    if (!user) {
      return { ok: false, message: 'Sign in before changing your password.' }
    }
    const normalized = user.email.toLowerCase()
    const overrides = readJSON<Record<string, string>>(PASSWORD_KEY, {})
    const registered = readJSON<RegisteredPatient[]>(REGISTERED_KEY, [])
    const registeredAccount = registered.find(
      (item) => item.email.toLowerCase() === normalized,
    )
    const currentPassword =
      overrides[normalized] ??
      registeredAccount?.password ??
      (user.role === 'admin'
        ? adminUser.password
        : user.role === 'doctor'
          ? 'Doctor@123'
          : 'Patient@123')

    if (currentPassword !== current) {
      return { ok: false, message: 'Your current password is not correct.' }
    }

    overrides[normalized] = next
    writeJSON(PASSWORD_KEY, overrides)
    if (registeredAccount) {
      registeredAccount.password = next
      writeJSON(REGISTERED_KEY, registered)
    }
    return {
      ok: true,
      message: 'Password updated. Use the new password next time you sign in.',
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        registerPatient,
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
