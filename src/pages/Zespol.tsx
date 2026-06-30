import { useCallback, useEffect, useState } from 'react'
import { useProfile } from '../components/Layout'
import { listTeamPipeline, subscribeTeam, type TeamRow } from '../lib/repo'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  dyrektor: 'Dyrektor',
  manager: 'Manager',
  doradca: 'Doradca',
}
const ROLE_ORDER: Record<string, number> = { admin: 0, dyrektor: 1, manager: 2, doradca: 3 }
const MANAGER_PLUS = ['admin', 'dyrektor', 'manager']

function fmtMM(v: number): string {
  return v ? v.toLocaleString('pl-PL') + ' zł' : '—'
}

export default function Zespol() {
  const profile = useProfile()
  const [rows, setRows] = useState<TeamRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)

  const allowed = MANAGER_PLUS.includes(profile.role)

  const load = useCallback(() => {
    listTeamPipeline()
      .then((rs) =>
        setRows(
          [...rs].sort(
            (a, b) =>
              (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) ||
              `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'pl'),
          ),
        ),
      )
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    if (!allowed) return
    load()
    // Realtime: zmiana clients/leads → przeładuj agregaty z widoku.
    const unsub = subscribeTeam(load)
    setLive(true)
    return () => {
      setLive(false)
      unsub()
    }
  }, [allowed, load])

  if (!allowed)
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-slate-900">Zespół</h1>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Ten widok jest dostępny dla managerów, dyrektorów i administratorów.
        </p>
      </div>
    )

  const advisors = rows?.filter((r) => r.role === 'doradca').length ?? 0

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Zespół</h1>
        {rows && (
          <span className="flex items-center gap-2 text-sm text-slate-500">
            {live && (
              <span className="inline-flex items-center gap-1.5 text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                na żywo
              </span>
            )}
            <span>
              {rows.length} osób · {advisors} doradców
            </span>
          </span>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Błąd wczytywania: {error}
        </p>
      )}
      {!rows && !error && <p className="mt-6 text-slate-400">Wczytywanie…</p>}
      {rows && rows.length === 0 && (
        <p className="mt-6 text-slate-400">Brak osób w Twoim zakresie.</p>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Osoba</th>
                <th className="px-4 py-3 font-medium">Rola</th>
                <th className="px-4 py-3 text-right font-medium">Klienci aktywni</th>
                <th className="px-4 py-3 text-right font-medium">Wygrani</th>
                <th className="px-4 py-3 text-right font-medium">MM (wygrane)</th>
                <th className="px-4 py-3 text-right font-medium">Leady</th>
                <th className="px-4 py-3 text-right font-medium">Zrekrutowani</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.userId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {r.firstName} {r.lastName}
                    {r.userId === profile.id && (
                      <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                        Ty
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{ROLE_LABEL[r.role] ?? r.role}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                    {r.clientsActive}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                    {r.clientsWon}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {fmtMM(r.mmWon)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{r.leadsTotal}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {r.recruits || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-slate-500">
        Agregaty liczone w bazie (widok <code className="text-slate-600">v_team_pipeline</code>),
        zakres wg RLS — widzisz siebie i swoje podległe struktury. Zmiany odświeżają się na żywo.
      </p>
    </div>
  )
}
