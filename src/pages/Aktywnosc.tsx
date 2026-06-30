import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActivity, subscribeActivity, type ActivityRow } from '../lib/repo'

// Etykiety + kolor wg typu zdarzenia (słownik aplikacji z prototypu).
function describe(e: ActivityRow): { label: string; dot: string } {
  const s = e.stage != null ? ` E${e.stage}` : ''
  switch (e.type) {
    case 'stage_enter':
      return { label: `Wejście na etap${s}`, dot: 'bg-violet-500' }
    case 'stage_done':
      return { label: `Zamknięcie etapu${s}`, dot: 'bg-emerald-500' }
    case 'stage_revert':
      return { label: `Cofnięcie do etapu${s}`, dot: 'bg-amber-500' }
    case 'checklist':
      return { label: 'Aktualizacja checklisty', dot: 'bg-slate-400' }
    case 'note':
      return { label: 'Notatka', dot: 'bg-slate-400' }
    case 'lost':
      return { label: 'Klient utracony', dot: 'bg-red-500' }
    case 'admin_action':
      return { label: 'Akcja administracyjna', dot: 'bg-sky-500' }
    default:
      return { label: e.type, dot: 'bg-slate-400' }
  }
}

function fmtWhen(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'przed chwilą'
  if (min < 60) return `${min} min temu`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} godz. temu`
  return d.toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Aktywnosc() {
  const [rows, setRows] = useState<ActivityRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)

  const load = useCallback(() => {
    listActivity()
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    load()
    const unsub = subscribeActivity(load)
    setLive(true)
    return () => {
      setLive(false)
      unsub()
    }
  }, [load])

  return (
    <div className="max-w-3xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Aktywność</h1>
        {live && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            na żywo
          </span>
        )}
      </div>
      <p className="mt-1 text-slate-500">
        Log zdarzeń w Twoim zakresie (RLS) — przejścia etapów, akcje na klientach.
      </p>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Błąd wczytywania: {error}
        </p>
      )}
      {!rows && !error && <p className="mt-6 text-slate-400">Wczytywanie…</p>}
      {rows && rows.length === 0 && (
        <p className="mt-6 text-slate-400">Brak zdarzeń do wyświetlenia.</p>
      )}

      {rows && rows.length > 0 && (
        <ol className="mt-6 space-y-1">
          {rows.map((e) => {
            const d = describe(e)
            const who = [e.userFirst, e.userLast].filter(Boolean).join(' ')
            const client = [e.clientFirst, e.clientLast].filter(Boolean).join(' ')
            return (
              <li key={e.id} className="flex gap-3">
                <div className="flex flex-col items-center pt-1.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${d.dot}`} />
                  <span className="mt-1 w-px flex-1 bg-slate-200" />
                </div>
                <div className="pb-4">
                  <div className="text-sm text-slate-800">
                    <span className="font-medium">{d.label}</span>
                    {client && (
                      <>
                        {' · '}
                        {e.clientId ? (
                          <Link
                            to={`/klienci/${e.clientId}`}
                            className="text-violet-600 hover:underline"
                          >
                            {client}
                          </Link>
                        ) : (
                          client
                        )}
                      </>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {who && <span>{who} · </span>}
                    {fmtWhen(e.createdAt)}
                  </div>
                  {e.note && <div className="mt-1 text-sm text-slate-500">{e.note}</div>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
