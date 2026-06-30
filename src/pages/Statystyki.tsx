import { useEffect, useMemo, useState } from 'react'
import { listClients, listLeads, type Client, type Lead } from '../lib/repo'

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktywni', won: 'Wygrani', lost: 'Utraceni', paused: 'Wstrzymani',
}
const STATUS_BAR: Record<string, string> = {
  active: 'bg-brass', won: 'bg-go', lost: 'bg-bad', paused: 'bg-warn',
}

function countBy<T>(arr: T[], key: (x: T) => string | null): [string, number][] {
  const m = new Map<string, number>()
  for (const x of arr) {
    const k = key(x) || '—'
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

export default function Statystyki() {
  const [clients, setClients] = useState<Client[] | null>(null)
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listClients(), listLeads()])
      .then(([c, l]) => { setClients(c); setLeads(l) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const data = useMemo(() => {
    if (!clients || !leads) return null
    const byStatus = countBy(clients, (c) => c.status)
    const byStage = Array.from({ length: 11 }, (_, i) => {
      const n = i + 1
      return [`E${n}`, clients.filter((c) => c.currentStage === n && c.status === 'active').length] as [string, number]
    }).filter(([, v]) => v > 0)
    const bySource = countBy(clients, (c) => c.source)
    const leadsByStatus = countBy(leads, (l) => l.status)
    const won = clients.filter((c) => c.status === 'won').length
    const conv = clients.length ? Math.round((won / clients.length) * 100) : 0
    return { byStatus, byStage, bySource, leadsByStatus, won, conv }
  }, [clients, leads])

  return (
    <div className="max-w-3xl">
      <div className="kicker">Narzędzia</div>
      <h1 className="text-2xl font-semibold text-cream">Statystyki</h1>
      <p className="mt-1 text-steel">Przekrój Twoich klientów i leadów (zakres wg RLS).</p>

      {error && (
        <p className="mt-6 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}
      {!data && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}

      {data && clients && leads && (
        <>
          {/* Liczby kluczowe */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat value={clients.length} label="Klienci" />
            <Stat value={clients.filter((c) => c.status === 'active').length} label="Aktywni" />
            <Stat value={data.won} label="Wygrani" tone="go" />
            <Stat value={`${data.conv}%`} label="Skuteczność" accent />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Panel title="Klienci wg statusu">
              {data.byStatus.map(([k, v]) => (
                <Bar key={k} label={STATUS_LABEL[k] ?? k} value={v} max={clients.length} color={STATUS_BAR[k] ?? 'bg-brass'} />
              ))}
            </Panel>
            <Panel title="Klienci wg źródła">
              {data.bySource.map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={clients.length} />
              ))}
            </Panel>
            <Panel title="Aktywni wg etapu">
              {data.byStage.length === 0 ? (
                <p className="text-sm text-steel">Brak aktywnych spraw.</p>
              ) : (
                data.byStage.map(([k, v]) => (
                  <Bar key={k} label={k} value={v} max={Math.max(...data.byStage.map((s) => s[1]))} />
                ))
              )}
            </Panel>
            <Panel title="Leady wg statusu">
              {data.leadsByStatus.map(([k, v]) => (
                <Bar
                  key={k}
                  label={k === 'free' ? 'Wolne' : k === 'assigned' ? 'Przypisane' : k}
                  value={v}
                  max={leads.length}
                  color={k === 'free' ? 'bg-info' : 'bg-go'}
                />
              ))}
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ value, label, accent, tone }: { value: number | string; label: string; accent?: boolean; tone?: 'go' }) {
  const color = accent ? 'text-brass' : tone === 'go' ? 'text-go' : 'text-cream'
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className={`font-display text-3xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-sm text-steel">{label}</div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel">{title}</div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function Bar({ label, value, max, color = 'bg-brass' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="truncate text-muted">{label}</span>
        <span className="ml-2 tabular-nums text-cream">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
    </div>
  )
}
