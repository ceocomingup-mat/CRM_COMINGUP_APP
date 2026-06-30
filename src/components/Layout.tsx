import { Suspense, useEffect, useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom'
import {
  LayoutGrid, Database, Users, FileText, ListChecks, Network, Map, CalendarDays,
  Star, Trophy, Calculator, Activity, ClipboardList, Newspaper, History,
  GraduationCap, BookOpen, LifeBuoy, Shield, User, Settings, Menu, X,
} from 'lucide-react'
import { signOut, type Profile } from '../lib/supabase'
import ErrorBoundary from './ErrorBoundary'
import TopBar from './TopBar'

export interface LayoutContext {
  profile: Profile
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfile(): Profile {
  return useOutletContext<LayoutContext>().profile
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  dyrektor: 'Dyrektor',
  manager: 'Manager',
  doradca: 'Doradca',
}

type Icon = ComponentType<{ className?: string }>
interface NavItem {
  to: string
  label: string
  icon: Icon
  end?: boolean
  roles?: string[]
}
// Pogrupowane menu (jak w projekcie). `roles` ogranicza widoczność; zakres danych
// i tak pilnuje RLS. Grupa bez widocznych pozycji nie pokazuje nagłówka.
const MANAGER_PLUS = ['admin', 'dyrektor', 'manager']
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Główne',
    items: [
      { to: '/', label: 'Pulpit', end: true, icon: LayoutGrid },
      { to: '/leady', label: 'Baza leadów', icon: Database },
      { to: '/klienci', label: 'Klienci', icon: Users },
      { to: '/umowy', label: 'Umowy', icon: FileText },
      { to: '/zadania', label: 'Zadania', icon: ListChecks },
      { to: '/zespol', label: 'Zespół', icon: Network, roles: MANAGER_PLUS },
    ],
  },
  {
    label: 'Narzędzia',
    items: [
      { to: '/mapa', label: 'Mapa', icon: Map },
      { to: '/kalendarz', label: 'Kalendarz', icon: CalendarDays },
      { to: '/ranking', label: 'Ranking', icon: Star, roles: MANAGER_PLUS },
      { to: '/zawody', label: 'Zawody', icon: Trophy },
      { to: '/kalkulator', label: 'Kalkulator prowizji', icon: Calculator },
      { to: '/statystyki', label: 'Statystyki', icon: Activity },
      { to: '/raporty', label: 'Rozliczenia', icon: ClipboardList, roles: MANAGER_PLUS },
      { to: '/aktualnosci', label: 'Aktualności', icon: Newspaper },
      { to: '/aktywnosc', label: 'Aktywność', icon: History },
      { to: '/szkolenia', label: 'Strefa Szkoleniowa', icon: GraduationCap },
      { to: '/materialy', label: 'Materiały', icon: BookOpen },
      { to: '/wsparcie', label: 'Wsparcie', icon: LifeBuoy },
    ],
  },
  {
    label: 'Administracja',
    items: [{ to: '/admin', label: 'Panel admina', icon: Shield, roles: ['admin'] }],
  },
  {
    label: 'Konto',
    items: [
      { to: '/profil', label: 'Profil', icon: User },
      { to: '/ustawienia', label: 'Ustawienia', icon: Settings },
    ],
  },
]

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brass font-display text-lg font-bold text-ink">
        C
      </div>
      <span className="font-display text-base font-semibold tracking-wide text-cream">
        Coming<span className="text-brass">UP</span>
      </span>
    </div>
  )
}

export default function Layout({
  profile,
  onLogout,
}: {
  profile: Profile
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  // Zamknij szufladę po zmianie trasy (mobile).
  useEffect(() => setOpen(false), [location.pathname])

  async function logout() {
    await signOut()
    onLogout()
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email
  const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()

  // Grupy z odfiltrowanymi pozycjami wg roli; puste grupy znikają.
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.includes(profile.role)),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="min-h-svh bg-surface">
      {/* Górny pasek — tylko mobile */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-card px-4 md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Otwórz menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-cream"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>
        <Logo />
      </header>

      {/* Tło przyciemniające (mobile, gdy otwarte) */}
      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/60 md:hidden" />
      )}

      {/* Sidebar / szuflada */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-card transition-transform duration-200 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <Logo />
          <button
            onClick={() => setOpen(false)}
            aria-label="Zamknij menu"
            className="text-steel hover:text-cream md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-2">
          {groups.map((group) => (
            <div key={group.label} className="mb-1 border-t border-line/60 pt-2 first:border-t-0 first:pt-0">
              <div className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-steel">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Ico = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'bg-brass/10 text-brass'
                            : 'text-muted hover:bg-surface hover:text-cream'
                        }`
                      }
                    >
                      <Ico className="h-[18px] w-[18px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-3">
          <Link
            to="/profil"
            className="-mx-1 flex items-center gap-2.5 rounded-lg px-1 py-1 transition hover:bg-surface"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brass/15 text-xs font-bold text-brass">
              {initials || '?'}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-cream">{fullName}</div>
              <div className="text-xs text-steel">{ROLE_LABEL[profile.role] ?? profile.role}</div>
            </div>
          </Link>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg border border-line2 px-3 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-cream"
          >
            Wyloguj
          </button>
        </div>
      </aside>

      <div className="md:ml-60">
        <TopBar profile={profile} onLogout={logout} />
        <main className="px-4 pb-10 pt-[4.5rem] md:px-8 md:pb-10 md:pt-6">
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<p className="text-steel">Wczytywanie…</p>}>
              <Outlet context={{ profile } satisfies LayoutContext} />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
