import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listCalendarEvents, listClients, type CalendarEvent } from '../lib/repo'

const TYPE_LABEL: Record<string, string> = {
  meeting: 'Spotkanie', termin: 'Termin', szkolenie: 'Szkolenie', zadanie: 'Zadanie',
}
const TYPE_STYLE: Record<string, string> = {
  meeting: 'bg-brass/15 text-brass',
  termin: 'bg-warn/15 text-warn',
  szkolenie: 'bg-info/15 text-info',
  zadanie: 'bg-go/15 text-go',
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}
function fmtDayHeader(key: string): string {
  const d = new Date(key + 'T12:00:00')
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const base = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  if (key === today) return `Dziś · ${base}`
  if (key === tomorrow) return `Jutro · ${base}`
  return base
}
function fmtTime(ev: CalendarEvent): string {
  if (ev.allDay || !ev.startTs) return 'cały dzień'
  const s = new Date(ev.startTs).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  if (ev.endTs) {
    const e = new Date(ev.endTs).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    return `${s}–${e}`
  }
  return s
}

export default function Kalendarz() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listCalendarEvents(), listClients()])
      .then(([evs, cs]) => {
        const m: Record<string, string> = {}
        for (const c of cs) m[c.id] = `${c.firstName} ${c.lastName}`.trim()
        setNames(m)
        setEvents(evs)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const groups = useMemo(() => {
    if (!events) return []
    const upcoming = events
      .filter((e) => e.startTs)
      .filter((e) => new Date(e.startTs!).getTime() >= startOfToday())
      .sort((a, b) => a.startTs!.localeCompare(b.startTs!))
    const byDay = new Map<string, CalendarEvent[]>()
    for (const e of upcoming) {
      const k = dayKey(e.startTs!)
      if (!byDay.has(k)) byDay.set(k, [])
      byDay.get(k)!.push(e)
    }
    return [...byDay.entries()]
  }, [events])

  return (
    <div className="max-w-3xl">
      <div className="kicker">Główne</div>
      <h1 className="text-2xl font-semibold text-cream">Kalendarz</h1>
      <p className="mt-1 text-steel">Nadchodzące spotkania, terminy i wydarzenia.</p>

      {error && (
        <p className="mt-6 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}
      {!events && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}
      {events && groups.length === 0 && (
        <p className="mt-6 rounded-2xl border border-line bg-card px-5 py-4 text-steel">
          Brak nadchodzących wydarzeń.
        </p>
      )}

      <div className="mt-6 space-y-6">
        {groups.map(([day, evs]) => (
          <div key={day}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brass">
              {fmtDayHeader(day)}
            </div>
            <div className="space-y-2">
              {evs.map((ev) => (
                <div key={ev.id} className="flex gap-4 rounded-2xl border border-line bg-card p-4 shadow-sm">
                  <div className="w-20 shrink-0 text-sm tabular-nums text-muted">{fmtTime(ev)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {ev.type && TYPE_STYLE[ev.type] && (
                        <span className={`badge rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[ev.type]}`}>
                          {TYPE_LABEL[ev.type] ?? ev.type}
                        </span>
                      )}
                      <span className="font-medium text-cream">{ev.title}</span>
                    </div>
                    {ev.location && <div className="mt-0.5 text-sm text-steel">📍 {ev.location}</div>}
                    {ev.clientId && names[ev.clientId] && (
                      <Link to={`/klienci/${ev.clientId}`} className="mt-1 inline-block text-sm text-brass hover:underline">
                        Klient: {names[ev.clientId]}
                      </Link>
                    )}
                    {ev.notes && <div className="mt-1 text-sm text-muted">{ev.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function startOfToday(): number {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime()
}
