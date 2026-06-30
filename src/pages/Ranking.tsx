import { useEffect, useState } from 'react'
import { useProfile } from '../components/Layout'
import { listTeamStats, listUsers, type UserStats } from '../lib/repo'

const MANAGER_PLUS = ['admin', 'dyrektor', 'manager']
const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator', dyrektor: 'Dyrektor', manager: 'Manager', doradca: 'Doradca',
}
const fmt = (n: number) => (n ? n.toLocaleString('pl-PL') + ' zł' : '—')
const MEDAL = ['🥇', '🥈', '🥉']

interface Row extends UserStats {
  name: string
  role: string
}

export default function Ranking() {
  const profile = useProfile()
  const allowed = MANAGER_PLUS.includes(profile.role)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!allowed) return
    Promise.all([listTeamStats(), listUsers()])
      .then(([stats, users]) => {
        const meta: Record<string, { name: string; role: string }> = {}
        for (const u of users) meta[u.id] = { name: `${u.firstName} ${u.lastName}`.trim(), role: u.role }
        const built: Row[] = stats
          .filter((s) => meta[s.userId]?.role === 'doradca') // ranking doradców
          .map((s) => ({ ...s, name: meta[s.userId]?.name ?? '—', role: meta[s.userId]?.role ?? '' }))
          .sort((a, b) => b.monthContracts - a.monthContracts || b.monthMm - a.monthMm)
        setRows(built)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [allowed])

  if (!allowed)
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-cream">Ranking</h1>
        <p className="mt-4 rounded-lg bg-warn/15 px-3 py-2 text-sm text-warn">
          Ranking zespołu jest dostępny dla managerów, dyrektorów i administratorów.
        </p>
      </div>
    )

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-cream">Ranking doradców</h1>
      <p className="mt-1 text-steel">Wyniki w Twojej strukturze — bieżący miesiąc (umowy, potem MM).</p>

      {error && (
        <p className="mt-6 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}
      {!rows && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}
      {rows && rows.length === 0 && (
        <p className="mt-6 rounded-2xl border border-line bg-card px-5 py-4 text-steel">
          Brak doradców w Twoim zakresie.
        </p>
      )}

      <ol className="mt-6 space-y-2">
        {rows?.map((r, i) => {
          const top = i < 3
          return (
            <li
              key={r.userId}
              className={`flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm ${
                top ? 'border-brass/40' : 'border-line'
              }`}
            >
              <div className="grid w-9 shrink-0 place-items-center text-lg font-bold">
                {top ? <span className="text-2xl">{MEDAL[i]}</span> : <span className="font-display text-steel">{i + 1}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-cream">{r.name}</div>
                <div className="text-xs text-steel">{ROLE_LABEL[r.role] ?? r.role}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl font-bold text-brass">{r.monthContracts}</div>
                <div className="text-xs text-steel">umów w tym mc</div>
              </div>
              <div className="hidden text-right sm:block">
                <div className="font-display text-base font-semibold text-cream">{fmt(r.monthMm)}</div>
                <div className="text-xs text-steel">MM w tym mc</div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
