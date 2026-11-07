import { useEffect, useRef, useState } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import type { Icon } from '@phosphor-icons/react'
import {
  Bell,
  Buildings,
  CalendarBlank,
  ChartBar,
  FolderOpen,
  List,
  MagnifyingGlass,
  Pill,
  Receipt,
  SignOut,
  SquaresFour,
  Stethoscope,
  UserCircle,
  Users,
  X,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { roleHome } from '../../lib/auth'
import type { Role } from '../../types'
import { Logo } from '../brand/Logo'
import { Avatar } from '../ui/Avatar'
import { buttonStyles } from '../ui/Button'
import { cn } from '../../lib/cn'

interface NavItem {
  label: string
  to: string
  icon: Icon
  end?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navByRole: Record<Role, NavGroup[]> = {
  patient: [
    {
      label: 'Care',
      items: [
        { label: 'Overview', to: '/patient/dashboard', icon: SquaresFour, end: true },
        {
          label: 'Find a doctor',
          to: '/patient/doctors',
          icon: MagnifyingGlass,
        },
        {
          label: 'Appointments',
          to: '/patient/appointments',
          icon: CalendarBlank,
        },
        {
          label: 'Medical records',
          to: '/patient/records',
          icon: FolderOpen,
        },
        { label: 'Bills', to: '/patient/bills', icon: Receipt },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'Profile', to: '/patient/profile', icon: UserCircle },
      ],
    },
  ],
  doctor: [
    {
      label: 'Practice',
      items: [
        { label: 'Overview', to: '/doctor/dashboard', icon: SquaresFour, end: true },
        {
          label: 'Appointments',
          to: '/doctor/appointments',
          icon: CalendarBlank,
        },
        { label: 'Patients', to: '/doctor/patients', icon: Users },
      ],
    },
    {
      label: 'Account',
      items: [{ label: 'Profile', to: '/doctor/profile', icon: UserCircle }],
    },
  ],
  admin: [
    {
      label: 'Clinic',
      items: [
        { label: 'Overview', to: '/admin/dashboard', icon: SquaresFour, end: true },
        {
          label: 'Appointments',
          to: '/admin/appointments',
          icon: CalendarBlank,
        },
        { label: 'Doctors', to: '/admin/doctors', icon: Stethoscope },
        { label: 'Patients', to: '/admin/patients', icon: Users },
      ],
    },
    {
      label: 'Catalog',
      items: [
        {
          label: 'Departments',
          to: '/admin/specializations',
          icon: Buildings,
        },
        {
          label: 'Medicines and tests',
          to: '/admin/catalog',
          icon: Pill,
        },
      ],
    },
    {
      label: 'Finance',
      items: [
        { label: 'Invoices', to: '/admin/invoices', icon: Receipt },
        { label: 'Reports', to: '/admin/reports', icon: ChartBar },
      ],
    },
    {
      label: 'Account',
      items: [{ label: 'Profile', to: '/admin/profile', icon: UserCircle }],
    },
  ],
}

const workspaceLabel: Record<Role, string> = {
  patient: 'Patient workspace',
  doctor: 'Doctor workspace',
  admin: 'Clinic administration',
}

const roleLabel: Record<Role, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  admin: 'Administrator',
}

function NavGroups({
  role,
  onNavigate,
}: {
  role: Role
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-6">
      {navByRole[role].map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 pb-1 caption-5 text-muted">{group.label}</p>
          {group.items.map((item) => {
            const ItemIcon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 body-5 transition-colors duration-300 ease-out-expo',
                    isActive
                      ? 'bg-mint text-primary'
                      : 'text-muted hover:bg-paper hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <ItemIcon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        isActive
                          ? 'text-primary'
                          : 'text-muted group-hover:text-ink',
                      )}
                      weight={isActive ? 'fill' : 'regular'}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function UserCard({ role }: { role: Role }) {
  const { user } = useAuth()
  if (!user) return null

  return (
    <Link
      to={`/${role}/profile`}
      className="flex items-center gap-3 rounded-lg p-2 transition-colors duration-300 ease-out-expo hover:bg-paper"
    >
      <Avatar name={user.name} photoUrl={user.photoUrl} size="sm" />
      <span className="min-w-0">
        <span className="block truncate body-5 text-ink">{user.name}</span>
        <span className="block caption-5 text-muted">{roleLabel[role]}</span>
      </span>
    </Link>
  )
}

export function AppShell({ role }: { role: Role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const navTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  if (!user) return null

  const today = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const signOut = () => {
    logout()
    toast('Signed out.')
    navigate('/')
  }

  return (
    <div className="min-h-svh bg-paper lg:flex">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border focus:border-line focus:bg-surface focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <aside
        aria-label="Workspace sidebar"
        className="hidden lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-line lg:bg-surface"
      >
        <div className="flex h-16 items-center border-b border-line px-4">
          <Link to={roleHome[role]} aria-label="AmazeCare workspace">
            <Logo />
          </Link>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-6">
          <p className="px-3 caption-5 text-muted">{workspaceLabel[role]}</p>
          <NavGroups role={role} />
        </div>

        <div className="border-t border-line p-3">
          <UserCard role={role} />
          <button
            type="button"
            onClick={signOut}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 caption-4 text-muted transition-colors duration-300 ease-out-expo hover:bg-paper hover:text-ink"
          >
            <SignOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              ref={navTriggerRef}
              type="button"
              onClick={() => setNavOpen(true)}
              className="icon-btn text-muted hover:bg-mint hover:text-ink"
              aria-label="Open navigation"
              aria-haspopup="dialog"
              aria-expanded={navOpen}
              aria-controls="workspace-navigation"
            >
              <List className="h-5 w-5" aria-hidden="true" />
            </button>
            <Link
              to={roleHome[role]}
              className="flex items-center gap-2"
              aria-label="AmazeCare workspace"
            >
              <Logo showWordmark={false} />
              <span className="title-3 text-ink">AmazeCare</span>
            </Link>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <p className="caption-4 text-muted">{today}</p>
            <span
              className="h-1 w-1 rounded-full bg-line"
              aria-hidden="true"
            />
            <p className="caption-4 text-muted">{workspaceLabel[role]}</p>
          </div>

          <div className="flex items-center gap-1">
            {role === 'patient' ? (
              <Link
                to="/patient/doctors"
                className={buttonStyles({
                  size: 'sm',
                  className: 'hidden sm:inline-flex',
                })}
              >
                Book appointment
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => toast('You are all caught up.')}
              className="icon-btn text-muted hover:bg-mint hover:text-ink"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
            </button>
            <Link
              to={`/${role}/profile`}
              className="flex items-center gap-2 rounded-lg p-1 transition-colors duration-300 ease-out-expo hover:bg-mint"
              aria-label="Open profile"
            >
              <Avatar name={user.name} photoUrl={user.photoUrl} size="sm" />
              <span className="hidden max-w-24 truncate caption-4 text-ink sm:inline">
                {user.name}
              </span>
            </Link>
          </div>
        </header>

        <main
          id="workspace-main"
          tabIndex={-1}
          className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <Dialog.Root open={navOpen} onOpenChange={setNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-ink/40 lg:hidden" />
          <Dialog.Content
            id="workspace-navigation"
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              navTriggerRef.current?.focus()
            }}
            className="dialog-mobile fixed inset-y-0 left-0 z-50 flex w-[calc(100%-3rem)] max-w-xs flex-col bg-surface shadow-slip focus:outline-none lg:hidden"
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Link
                to={roleHome[role]}
                onClick={() => setNavOpen(false)}
                aria-label="AmazeCare workspace"
              >
                <Logo />
              </Link>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="icon-btn text-muted hover:bg-mint hover:text-ink"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-6">
              <NavGroups role={role} onNavigate={() => setNavOpen(false)} />
            </div>

            <div className="border-t border-line p-3">
              <UserCard role={role} />
              <button
                type="button"
                onClick={signOut}
                className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 caption-4 text-muted transition-colors duration-300 ease-out-expo hover:bg-paper hover:text-ink"
              >
                <SignOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
