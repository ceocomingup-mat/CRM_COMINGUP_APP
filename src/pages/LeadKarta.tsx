import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  getLead,
  getClientByLead,
  listUsers,
  startProcess,
  type Lead,
} from '../lib/repo'

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

export default function LeadKarta() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [lead, setLead] = useState<Lead | null>(null)
  const [advisor, setAdvisor] = useState<string>('')
  const [existingClientId, setExistingClientId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getLead(id), listUsers(), getClientByLead(id)])
      .then(([l, us, c]) => {
        setLead(l)
        setExistingClientId(c?.id ?? null)
        if (l?.advisorId) {
          const u = us.find((x) => x.id === l.advisorId)
          setAdvisor(u ? `${u.firstName} ${u.lastName}`.trim() : '')
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-slate-400">Wczytywanie…</p>
  if (error)
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Błąd: {error}</p>
    )
  if (!lead)
    return (
      <div>
        <BackLink />
        <p className="mt-4 text-slate-400">Nie znaleziono leada.</p>
      </div>
    )

  async function start() {
    if (!lead) return
    setSaving(true)
    setActionError(null)
    try {
      const client = await startProcess(lead.id)
      navigate(`/klienci/${client.id}`)
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <BackLink />

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="mt-1 text-slate-500">
            {[lead.city, lead.province].filter(Boolean).join(', ') || 'Brak lokalizacji'}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            STATUS_STYLE[lead.status] ?? 'bg-slate-100 text-slate-700'
          }`}
        >
          {STATUS_LABEL[lead.status] ?? lead.status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-3">
        <Field label="Telefon" value={lead.phone} />
        <Field label="E-mail" value={lead.email} />
        <Field label="Źródło" value={lead.source} />
        <Field label="Doradca" value={advisor || (lead.status === 'free' ? 'Wolny (pula)' : null)} />
      </div>

      {/* Akcja: Rozpocznij proces (lead → klient, etap 1) */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {existingClientId ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Proces tego leada jest już rozpoczęty.
            </p>
            <Link
              to={`/klienci/${existingClientId}`}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700"
            >
              Otwórz kartę klienta →
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {lead.status === 'free'
                ? 'Przejmiesz tego leada i stanie się Twoim klientem na etapie 1.'
                : 'Lead stanie się klientem na etapie 1 i pojawi się w „Klienci".'}
            </p>
            <button
              onClick={start}
              disabled={saving}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-40"
            >
              {saving ? 'Rozpoczynanie…' : 'Rozpocznij proces (etap 1)'}
            </button>
          </div>
        )}
        {actionError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Nie udało się rozpocząć procesu: {actionError}
          </p>
        )}
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/leady" className="text-sm text-violet-600 hover:underline">
      ← Wróć do listy leadów
    </Link>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-slate-800">{value || '—'}</div>
    </div>
  )
}
