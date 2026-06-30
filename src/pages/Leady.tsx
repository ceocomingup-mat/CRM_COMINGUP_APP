import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listLeads, listUsers, type Lead } from '../lib/repo'

const STATUS_LABEL: Record<string, string> = {
  free: 'Wolny',
  assigned: 'Przypisany',
  rejected: 'Odrzucony',
  lost: 'Utracony',
}
const STATUS_STYLE: Record<string, string> = {
  free: 'bg-info/15 text-info',
  assigned: 'bg-go/15 text-go',
  rejected: 'bg-bad/15 text-bad',
  lost: 'bg-surface text-muted',
}

export default function Leady() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listLeads(), listUsers()])
      .then(([ls, us]) => {
        const map: Record<string, string> = {}
        for (const u of us) map[u.id] = `${u.firstName} ${u.lastName}`.trim()
        setNames(map)
        setLeads(
          ls.sort((a, b) => a.lastName.localeCompare(b.lastName, 'pl')),
        )
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const free = leads?.filter((l) => l.status === 'free').length ?? 0

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div><div className="kicker">Główne</div>
        <h1 className="text-2xl font-semibold text-cream">Leady</h1></div>
        {leads && (
          <span className="text-sm text-steel">
            {leads.length} widocznych · {free} wolnych
          </span>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">
          Błąd wczytywania: {error}
        </p>
      )}
      {!leads && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}
      {leads && leads.length === 0 && (
        <p className="mt-6 text-steel">Brak leadów do wyświetlenia.</p>
      )}

      {leads && leads.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Lokalizacja</th>
                <th className="px-4 py-3 font-medium">Źródło</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Doradca</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leads.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => navigate(`/leady/${l.id}`)}
                  className="cursor-pointer hover:bg-surface"
                >
                  <td className="px-4 py-3 font-medium text-cream">
                    {l.firstName} {l.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {[l.city, l.province].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">{l.source || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block badge rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[l.status] ?? 'bg-surface text-muted'
                      }`}
                    >
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {l.advisorId ? names[l.advisorId] ?? '—' : '—'}
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
