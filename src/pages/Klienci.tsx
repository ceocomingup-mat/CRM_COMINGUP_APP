import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listClients, listUsers, listStages, type Client, type Stage } from '../lib/repo'
import Avatar from '../components/Avatar'

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktywny',
  won: 'Wygrany',
  lost: 'Utracony',
  paused: 'Wstrzymany',
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-go/15 text-go',
  won: 'bg-brass/10 text-brass',
  lost: 'bg-bad/15 text-bad',
  paused: 'bg-warn/15 text-warn',
}

function fmtMM(v: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('pl-PL') + ' zł'
}

export default function Klienci() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [stageNames, setStageNames] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listClients(), listUsers(), listStages()])
      .then(([cs, us, st]) => {
        const map: Record<string, string> = {}
        for (const u of us) map[u.id] = `${u.firstName} ${u.lastName}`.trim()
        setNames(map)
        const sm: Record<number, string> = {}
        for (const s of st as Stage[]) sm[s.stageOrder] = s.name
        setStageNames(sm)
        setClients(cs.sort((a, b) => a.lastName.localeCompare(b.lastName, 'pl')))
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const maxStage = Object.keys(stageNames).reduce((m, k) => Math.max(m, Number(k)), 0)

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div><div className="kicker">Główne</div>
        <h1 className="text-2xl font-semibold text-cream">Klienci</h1></div>
        {clients && (
          <span className="text-sm text-steel">{clients.length} widocznych</span>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">
          Błąd wczytywania: {error}
        </p>
      )}

      {!clients && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}

      {clients && clients.length === 0 && (
        <p className="mt-6 text-steel">Brak klientów do wyświetlenia.</p>
      )}

      {clients && clients.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3 font-medium">Klient</th>
                <th className="px-4 py-3 font-medium">Lokalizacja</th>
                <th className="px-4 py-3 font-medium">Etap</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">MM</th>
                <th className="px-4 py-3 font-medium">Doradca</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clients.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/klienci/${c.id}`)}
                  className="cursor-pointer hover:bg-surface"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${c.firstName} ${c.lastName}`} />
                      <span className="font-medium text-cream">
                        {c.firstName} {c.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {[c.city, c.province].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block whitespace-nowrap rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                      E{c.currentStage}
                      {stageNames[c.currentStage] ? ` · ${stageNames[c.currentStage]}` : ''}
                    </span>
                    {maxStage > 0 && (
                      <div className="mt-1.5 flex gap-0.5">
                        {Array.from({ length: maxStage }, (_, i) => (
                          <span
                            key={i}
                            className={`h-1 w-2.5 rounded-full ${i < c.currentStage ? 'bg-brass' : 'bg-line2'}`}
                          />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block badge rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[c.status] ?? 'bg-surface text-muted'
                      }`}
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {fmtMM(c.mmNetto)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.advisorId ? names[c.advisorId] ?? '—' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
