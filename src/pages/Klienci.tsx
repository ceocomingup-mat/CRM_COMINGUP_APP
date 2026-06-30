import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listClients, listUsers, type Client } from '../lib/repo'

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktywny',
  won: 'Wygrany',
  lost: 'Utracony',
  paused: 'Wstrzymany',
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  won: 'bg-violet-50 text-violet-700',
  lost: 'bg-red-50 text-red-700',
  paused: 'bg-amber-50 text-amber-700',
}

function fmtMM(v: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('pl-PL') + ' zł'
}

export default function Klienci() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listClients(), listUsers()])
      .then(([cs, us]) => {
        const map: Record<string, string> = {}
        for (const u of us) map[u.id] = `${u.firstName} ${u.lastName}`.trim()
        setNames(map)
        setClients(cs.sort((a, b) => a.lastName.localeCompare(b.lastName, 'pl')))
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Klienci</h1>
        {clients && (
          <span className="text-sm text-slate-500">{clients.length} widocznych</span>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Błąd wczytywania: {error}
        </p>
      )}

      {!clients && !error && <p className="mt-6 text-slate-400">Wczytywanie…</p>}

      {clients && clients.length === 0 && (
        <p className="mt-6 text-slate-400">Brak klientów do wyświetlenia.</p>
      )}

      {clients && clients.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Klient</th>
                <th className="px-4 py-3 font-medium">Lokalizacja</th>
                <th className="px-4 py-3 font-medium">Etap</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">MM</th>
                <th className="px-4 py-3 font-medium">Doradca</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/klienci/${c.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {[c.city, c.province].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      E{c.currentStage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[c.status] ?? 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {fmtMM(c.mmNetto)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
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
