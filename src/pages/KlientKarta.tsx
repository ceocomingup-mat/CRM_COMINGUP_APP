import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getClient,
  listStages,
  listStageHistory,
  listUsers,
  setClientStage,
  type Client,
  type Stage,
  type StageHistory,
} from '../lib/repo'

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
  return v == null ? '—' : v.toLocaleString('pl-PL') + ' zł'
}
function fmtDate(v: string | null): string {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pl-PL')
}

export default function KlientKarta() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [history, setHistory] = useState<StageHistory[]>([])
  const [advisor, setAdvisor] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getClient(id), listStages(), listStageHistory(id), listUsers()])
      .then(([c, st, h, us]) => {
        setClient(c)
        setStages(st)
        setHistory(h)
        if (c?.advisorId) {
          const u = us.find((x) => x.id === c.advisorId)
          setAdvisor(u ? `${u.firstName} ${u.lastName}`.trim() : '')
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-slate-400">Wczytywanie…</p>
  if (error)
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        Błąd: {error}
      </p>
    )
  if (!client)
    return (
      <div>
        <BackLink />
        <p className="mt-4 text-slate-400">Nie znaleziono klienta.</p>
      </div>
    )

  const histByStage = new Map<number, StageHistory>()
  for (const h of history) histByStage.set(h.stage, h)

  const maxStage = stages.length || 11
  const canAct = client.status === 'active'

  async function move(delta: number) {
    if (!client) return
    const target = client.currentStage + delta
    if (target < 1 || target > maxStage) return
    setSaving(true)
    setActionError(null)
    try {
      const updated = await setClientStage(client.id, target)
      setClient(updated)
      setHistory(await listStageHistory(client.id))
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <BackLink />

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {client.firstName} {client.lastName}
          </h1>
          <p className="mt-1 text-slate-500">
            {[client.city, client.province].filter(Boolean).join(', ') || 'Brak lokalizacji'}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            STATUS_STYLE[client.status] ?? 'bg-slate-100 text-slate-700'
          }`}
        >
          {STATUS_LABEL[client.status] ?? client.status}
        </span>
      </div>

      {/* Dane klienta */}
      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-3">
        <Field label="Telefon" value={client.phone} />
        <Field label="E-mail" value={client.email} />
        <Field label="Adres" value={client.address} />
        <Field label="Źródło" value={client.source} />
        <Field label="Produkt" value={client.product} />
        <Field label="Doradca" value={advisor} />
        <Field label="Masa Marży" value={fmtMM(client.mmNetto)} />
        <Field label="Data umowy" value={fmtDate(client.contractDate) || null} />
        <Field label="Status MM" value={client.mmStatus} />
      </div>

      {/* Proces 11 etapów */}
      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Proces · etap {client.currentStage} z {maxStage}
        </h2>
        {canAct && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => move(-1)}
              disabled={saving || client.currentStage <= 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
            >
              ← Cofnij
            </button>
            <button
              onClick={() => move(1)}
              disabled={saving || client.currentStage >= maxStage}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-40"
            >
              {saving ? 'Zapisywanie…' : 'Dalej →'}
            </button>
          </div>
        )}
      </div>
      {actionError && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Nie udało się zmienić etapu: {actionError}
        </p>
      )}
      <ol className="space-y-1">
        {stages.map((s) => {
          const n = s.stageOrder
          const isDone = client.status === 'won' || n < client.currentStage
          const isCurrent = n === client.currentStage && client.status !== 'won'
          const isLost = isCurrent && client.status === 'lost'
          const h = histByStage.get(n)
          return (
            <li key={s.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                    isLost
                      ? 'bg-red-100 text-red-700'
                      : isDone
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isDone ? '✓' : n}
                </div>
                {n < stages.length && (
                  <div
                    className={`w-0.5 flex-1 ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`}
                  />
                )}
              </div>
              <div className={`pb-4 ${isCurrent ? '' : ''}`}>
                <div
                  className={`font-medium ${
                    isCurrent ? 'text-violet-700' : isDone ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {s.name}
                  {isCurrent && (
                    <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                      {isLost ? 'utracony tutaj' : 'tutaj'}
                    </span>
                  )}
                </div>
                {s.description && (
                  <div className="text-sm text-slate-500">{s.description}</div>
                )}
                {h && (h.enteredAt || h.completedAt) && (
                  <div className="mt-0.5 text-xs text-slate-400">
                    {fmtDate(h.enteredAt) && `wejście ${fmtDate(h.enteredAt)}`}
                    {fmtDate(h.completedAt) && ` · zakończenie ${fmtDate(h.completedAt)}`}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/klienci" className="text-sm text-violet-600 hover:underline">
      ← Wróć do listy klientów
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
