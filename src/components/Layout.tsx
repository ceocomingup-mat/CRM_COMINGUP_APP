import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { signOut, type Profile } from '../lib/supabase'

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

// Pozycje menu; `roles` (gdy podane) ogranicza widoczność do wskazanych ról.
// Zakres danych i tak pilnuje RLS — to tylko ukrycie nieprzydatnych pozycji.
const MANAGER_PLUS = ['admin', 'dyrektor', 'manager']
const NAV = [
  { to: '/', label: 'Pulpit', end: true },
  { to: '/klienci', label: 'Klienci', end: false },
  { to: '/leady', label: 'Leady', end: false },
  { to: '/zadania', label: 'Zadania', end: false },
  { to: '/kalendarz', label: 'Kalendarz', end: false },
  { to: '/umowy', label: 'Umowy', end: false },
  { to: '/kalkulator', label: 'Kalkulator', end: false },
  { to: '/mapa', label: 'Mapa', end: false },
  { to: '/aktualnosci', label: 'Aktualności', end: false },
  { to: '/aktywnosc', label: 'Aktywność', end: false },
  { to: '/ranking', label: 'Ranking', end: false, roles: MANAGER_PLUS },
  { to: '/zawody', label: 'Zawody', end: false },
  { to: '/statystyki', label: 'Statystyki', end: false },
  { to: '/szkolenia', label: 'Szkolenia', end: false },
  { to: '/materialy', label: 'Materiały', end: false },
  { to: '/wsparcie', label: 'Wsparcie', end: false },
  { to: '/zespol', label: 'Zespół', end: false, roles: MANAGER_PLUS },
  { to: '/raporty', label: 'Raporty', end: false, roles: MANAGER_PLUS },
  { to: '/admin', label: 'Administracja', end: false, roles: ['admin'] },
  { to: '/ustawienia', label: 'Ustawienia', end: false },
]

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brass font-bold text-ink">C</div>
      <span className="font-semibold text-cream">ComingUP CRM</span>
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
  const items = NAV.filter((item) => !item.roles || item.roles.includes(profile.role))

  return (
    <div className="min-h-svh bg-surface">
      {/* Górny pasek — tylko mobile */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-card px-4 md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Otwórz menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-cream"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
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
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brass/10 text-brass' : 'text-muted hover:bg-surface'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-3">
          <Link to="/profil" className="block rounded-lg -mx-1 px-1 py-1 transition hover:bg-surface">
            <div className="truncate text-sm font-medium text-cream">{fullName}</div>
            <div className="text-xs text-steel">{ROLE_LABEL[profile.role] ?? profile.role} · profil</div>
          </Link>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg border border-line2 px-3 py-1.5 text-sm text-muted transition hover:bg-surface"
          >
            Wyloguj
          </button>
        </div>
      </aside>

      <main className="px-4 pb-10 pt-[4.5rem] md:ml-60 md:px-8 md:py-8">
        <Suspense fallback={<p className="text-steel">Wczytywanie…</p>}>
          <Outlet context={{ profile } satisfies LayoutContext} />
        </Suspense>
      </main>
    </div>
  )
}
