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
import Avatar from '../components/Avatar'
import { SOURCE_LABEL, PRODUCT_LABEL, MM_STATUS_LABEL, label } from '../lib/labels'

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

  if (loading) return <p className="text-steel">Wczytywanie…</p>
  if (error)
    return (
      <p className="rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">
        Błąd: {error}
      </p>
    )
  if (!client)
    return (
      <div>
        <BackLink />
        <p className="mt-4 text-steel">Nie znaleziono klienta.</p>
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

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <Avatar name={`${client.firstName} ${client.lastName}`} size="lg" />
          <div>
            <div className="kicker">Klient</div>
            <h1 className="text-2xl font-semibold text-cream">
              {client.firstName} {client.lastName}
            </h1>
            <p className="mt-1 text-steel">
              {[client.city, client.province].filter(Boolean).join(', ') || 'Brak lokalizacji'}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            STATUS_STYLE[client.status] ?? 'bg-surface text-muted'
          }`}
        >
          {STATUS_LABEL[client.status] ?? client.status}
        </span>
      </div>

      {/* Dane klienta */}
      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 rounded-2xl border border-line bg-card p-5 text-sm shadow-sm sm:grid-cols-3">
        <Field label="Telefon" value={client.phone} />
        <Field label="E-mail" value={client.email} />
        <Field label="Adres" value={client.address} />
        <Field label="Źródło" value={label(SOURCE_LABEL, client.source)} />
        <Field label="Produkt" value={label(PRODUCT_LABEL, client.product)} />
        <Field label="Doradca" value={advisor} />
        <Field label="Masa Marży" value={fmtMM(client.mmNetto)} />
        <Field label="Data umowy" value={fmtDate(client.contractDate) || null} />
        <Field label="Status MM" value={label(MM_STATUS_LABEL, client.mmStatus)} />
      </div>

      {/* Proces 11 etapów */}
      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-cream">
          Proces · etap {client.currentStage} z {maxStage}
        </h2>
        {canAct && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => move(-1)}
              disabled={saving || client.currentStage <= 1}
              className="rounded-lg border border-line2 px-3 py-1.5 text-sm text-muted transition hover:bg-surface disabled:opacity-40"
            >
              ← Cofnij
            </button>
            <button
              onClick={() => move(1)}
              disabled={saving || client.currentStage >= maxStage}
              className="rounded-lg bg-brass px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-brass2 disabled:opacity-40"
            >
              {saving ? 'Zapisywanie…' : 'Dalej →'}
            </button>
          </div>
        )}
      </div>
      {actionError && (
        <p className="mb-4 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">
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
                      ? 'bg-bad/20 text-bad'
                      : isDone
                        ? 'bg-go text-ink'
                        : isCurrent
                          ? 'bg-brass text-ink'
                          : 'bg-surface text-steel'
                  }`}
                >
                  {isDone ? '✓' : n}
                </div>
                {n < stages.length && (
                  <div
                    className={`w-0.5 flex-1 ${isDone ? 'bg-go/40' : 'bg-cardhi'}`}
                  />
                )}
              </div>
              <div className={`pb-4 ${isCurrent ? '' : ''}`}>
                <div
                  className={`font-medium ${
                    isCurrent ? 'text-brass' : isDone ? 'text-cream' : 'text-steel'
                  }`}
                >
                  {s.name}
                  {isCurrent && (
                    <span className="ml-2 rounded-full bg-brass/15 px-2 py-0.5 text-xs text-brass">
                      {isLost ? 'utracony tutaj' : 'tutaj'}
                    </span>
                  )}
                </div>
                {s.description && (
                  <div className="text-sm text-steel">{s.description}</div>
                )}
                {h && (h.enteredAt || h.completedAt) && (
                  <div className="mt-0.5 text-xs text-steel">
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
    <Link to="/klienci" className="text-sm text-brass hover:underline">
      ← Wróć do listy klientów
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
