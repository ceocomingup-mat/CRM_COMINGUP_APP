import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Bell, ChevronDown, LogOut, User as UserIcon } from 'lucide-react'
import {
  listClients, listLeads, listNotifications, markNotificationRead,
  type Client, type Lead, type AppNotification,
} from '../lib/repo'
import type { Profile } from '../lib/supabase'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator', dyrektor: 'Dyrektor', manager: 'Manager', doradca: 'Doradca',
}

type Hit = { id: string; name: string; sub: string; to: string }

export default function TopBar({ profile, onLogout }: { profile: Profile; onLogout: () => void }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState<null | 'search' | 'bell' | 'user'>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // dane do szukajki + powiadomienia (pobierane raz)
  const [clients, setClients] = useState<Client[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [notifs, setNotifs] = useState<AppNotification[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    listClients().then(setClients).catch(() => {})
    listLeads().then(setLeads).catch(() => {})
    listNotifications().then(setNotifs).catch(() => {})
  }, [])

  // zamknij dropdowny po kliknięciu poza
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const hits: Hit[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const cl = clients
      .filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, sub: `Klient · ${c.city || c.province || ''}`, to: `/klienci/${c.id}` }))
    const ld = leads
      .filter((l) => `${l.firstName} ${l.lastName}`.toLowerCase().includes(q))
      .slice(0, 5)
      .map((l) => ({ id: l.id, name: `${l.firstName} ${l.lastName}`, sub: `Lead · ${l.city || l.province || ''}`, to: `/leady/${l.id}` }))
    return [...cl, ...ld].slice(0, 8)
  }, [query, clients, leads])

  const unread = notifs.filter((n) => !n.read).length
  const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email

  function goHit(h: Hit) {
    setOpen(null); setQuery(''); navigate(h.to)
  }
  async function openNotif(n: AppNotification) {
    if (!n.read) {
      try { await markNotificationRead(n.id); setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))) } catch { /* ignore */ }
    }
  }

  return (
    <div
      ref={rootRef}
      className="sticky top-0 z-20 hidden h-14 items-center gap-3 border-b border-line bg-card/95 px-6 backdrop-blur md:flex"
    >
      {/* Szukajka */}
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen('search') }}
          onFocus={() => setOpen('search')}
          placeholder="Szukaj klientów, leadów…"
          className="w-full rounded-lg border border-line2 bg-bg py-2 pl-9 pr-3 text-sm text-cream outline-none placeholder:text-steel focus:border-brass focus:ring-2 focus:ring-brass/30"
        />
        {open === 'search' && hits.length > 0 && (
          <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
            {hits.map((h) => (
              <button
                key={h.to}
                onClick={() => goHit(h)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-surface"
              >
                <span className="text-sm text-cream">{h.name}</span>
                <span className="text-xs text-steel">{h.sub}</span>
              </button>
            ))}
          </div>
        )}
        {open === 'search' && query.trim().length >= 2 && hits.length === 0 && (
          <div className="absolute left-0 right-0 top-12 rounded-xl border border-line bg-card px-4 py-3 text-sm text-steel shadow-lg">
            Brak wyników dla „{query.trim()}".
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Dzwonek */}
      <div className="relative">
        <button
          onClick={() => setOpen(open === 'bell' ? null : 'bell')}
          aria-label="Powiadomienia"
          className="relative grid h-9 w-9 place-items-center rounded-lg border border-line2 text-muted transition hover:bg-surface hover:text-cream"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
        {open === 'bell' && (
          <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
            <div className="border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-steel">
              Powiadomienia
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 && <p className="px-4 py-4 text-sm text-steel">Brak powiadomień.</p>}
              {notifs.slice(0, 12).map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotif(n)}
                  className={`block w-full border-b border-line/60 px-4 py-2.5 text-left transition last:border-0 hover:bg-surface ${n.read ? '' : 'bg-brass/5'}`}
                >
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />}
                    <span className="truncate text-sm text-cream">{n.title || n.type}</span>
                  </div>
                  {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-steel">{n.body}</div>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Menu użytkownika */}
      <div className="relative">
        <button
          onClick={() => setOpen(open === 'user' ? null : 'user')}
          className="flex items-center gap-2 rounded-lg border border-line2 py-1 pl-1 pr-2 transition hover:bg-surface"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-brass/15 text-xs font-bold text-brass">
            {initials || '?'}
          </span>
          <span className="hidden text-sm text-cream lg:block">{profile.firstName}</span>
          <ChevronDown className="h-4 w-4 text-steel" />
        </button>
        {open === 'user' && (
          <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
            <div className="border-b border-line px-4 py-3">
              <div className="truncate text-sm font-medium text-cream">{fullName}</div>
              <div className="text-xs text-steel">{ROLE_LABEL[profile.role] ?? profile.role}</div>
            </div>
            <Link
              to="/profil"
              onClick={() => setOpen(null)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted transition hover:bg-surface hover:text-cream"
            >
              <UserIcon className="h-4 w-4" /> Mój profil
            </Link>
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-sm text-muted transition hover:bg-surface hover:text-cream"
            >
              <LogOut className="h-4 w-4" /> Wyloguj
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
