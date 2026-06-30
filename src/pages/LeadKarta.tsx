import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  getLead,
  getClientByLead,
  listUsers,
  startProcess,
  type Lead,
} from '../lib/repo'
import { SOURCE_LABEL, label } from '../lib/labels'

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

  if (loading) return <p className="text-steel">Wczytywanie…</p>
  if (error)
    return (
      <p className="rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
    )
  if (!lead)
    return (
      <div>
        <BackLink />
        <p className="mt-4 text-steel">Nie znaleziono leada.</p>
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
          <h1 className="text-2xl font-semibold text-cream">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="mt-1 text-steel">
            {[lead.city, lead.province].filter(Boolean).join(', ') || 'Brak lokalizacji'}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            STATUS_STYLE[lead.status] ?? 'bg-surface text-muted'
          }`}
        >
          {STATUS_LABEL[lead.status] ?? lead.status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 rounded-2xl border border-line bg-card p-5 text-sm shadow-sm sm:grid-cols-3">
        <Field label="Telefon" value={lead.phone} />
        <Field label="E-mail" value={lead.email} />
        <Field label="Źródło" value={label(SOURCE_LABEL, lead.source)} />
        <Field label="Doradca" value={advisor || (lead.status === 'free' ? 'Wolny (pula)' : null)} />
      </div>

      {/* Akcja: Rozpocznij proces (lead → klient, etap 1) */}
      <div className="mt-8 rounded-2xl border border-line bg-card p-5 shadow-sm">
        {existingClientId ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Proces tego leada jest już rozpoczęty.
            </p>
            <Link
              to={`/klienci/${existingClientId}`}
              className="rounded-lg bg-brass px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-brass2"
            >
              Otwórz kartę klienta →
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {lead.status === 'free'
                ? 'Przejmiesz tego leada i stanie się Twoim klientem na etapie 1.'
                : 'Lead stanie się klientem na etapie 1 i pojawi się w „Klienci".'}
            </p>
            <button
              onClick={start}
              disabled={saving}
              className="rounded-lg bg-brass px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-brass2 disabled:opacity-40"
            >
              {saving ? 'Rozpoczynanie…' : 'Rozpocznij proces (etap 1)'}
            </button>
          </div>
        )}
        {actionError && (
          <p className="mt-3 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">
            Nie udało się rozpocząć procesu: {actionError}
          </p>
        )}
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/leady" className="text-sm text-brass hover:underline">
      ← Wróć do listy leadów
    </Link>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="text-cream">{value || '—'}</div>
    </div>
  )
}
