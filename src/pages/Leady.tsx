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
  free: 'bg-sky-50 text-sky-700',
  assigned: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  lost: 'bg-slate-100 text-slate-600',
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
        <h1 className="text-2xl font-semibold text-slate-900">Leady</h1>
        {leads && (
          <span className="text-sm text-slate-500">
            {leads.length} widocznych · {free} wolnych
          </span>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Błąd wczytywania: {error}
        </p>
      )}
      {!leads && !error && <p className="mt-6 text-slate-400">Wczytywanie…</p>}
      {leads && leads.length === 0 && (
        <p className="mt-6 text-slate-400">Brak leadów do wyświetlenia.</p>
      )}

      {leads && leads.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Lokalizacja</th>
                <th className="px-4 py-3 font-medium">Źródło</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Doradca</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => navigate(`/leady/${l.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {l.firstName} {l.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {[l.city, l.province].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.source || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[l.status] ?? 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
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
