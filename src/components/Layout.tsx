import { NavLink, Outlet, useOutletContext } from 'react-router-dom'
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
  { to: '/umowy', label: 'Umowy', end: false },
  { to: '/kalkulator', label: 'Kalkulator', end: false },
  { to: '/mapa', label: 'Mapa', end: false },
  { to: '/aktywnosc', label: 'Aktywność', end: false },
  { to: '/szkolenia', label: 'Szkolenia', end: false },
  { to: '/materialy', label: 'Materiały', end: false },
  { to: '/wsparcie', label: 'Wsparcie', end: false },
  { to: '/zespol', label: 'Zespół', end: false, roles: MANAGER_PLUS },
  { to: '/raporty', label: 'Raporty', end: false, roles: MANAGER_PLUS },
]

export default function Layout({
  profile,
  onLogout,
}: {
  profile: Profile
  onLogout: () => void
}) {
  async function logout() {
    await signOut()
    onLogout()
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email

  return (
    <div className="min-h-svh bg-surface">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-line bg-card">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brass font-bold text-ink">
            C
          </div>
          <span className="font-semibold text-cream">ComingUP CRM</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.filter((item) => !item.roles || item.roles.includes(profile.role)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brass/10 text-brass'
                    : 'text-muted hover:bg-surface'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-3">
          <div className="truncate text-sm font-medium text-cream">{fullName}</div>
          <div className="text-xs text-steel">
            {ROLE_LABEL[profile.role] ?? profile.role}
          </div>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg border border-line2 px-3 py-1.5 text-sm text-muted transition hover:bg-surface"
          >
            Wyloguj
          </button>
        </div>
      </aside>

      <main className="ml-60 px-8 py-8">
        <Outlet context={{ profile } satisfies LayoutContext} />
      </main>
    </div>
  )
}
