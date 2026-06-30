import { useEffect, useMemo, useState } from 'react'
import type { Profile } from '../lib/supabase'
import { createGoal, listGoals, updateGoalTarget, type Goal } from '../lib/repo'

const GATED_ROLES = ['dyrektor', 'manager', 'doradca']

const PL_MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

interface PeriodDef {
  type: 'month' | 'quarter' | 'year'
  label: string
  start: string // 'YYYY-MM-DD'
  subtitle: string
}

const iso = (y: number, m0: number, d: number) =>
  `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// Bieżące okresy (mc/kw/rok) wg lokalnej daty — start jako 'YYYY-MM-DD' (kolumna date).
function currentPeriods(): PeriodDef[] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const q = Math.floor(m / 3)
  return [
    { type: 'month', label: 'Cel miesięczny', start: iso(y, m, 1), subtitle: `${PL_MONTHS[m]} ${y}` },
    { type: 'quarter', label: 'Cel kwartalny', start: iso(y, q * 3, 1), subtitle: `Q${q + 1} ${y}` },
    { type: 'year', label: 'Cel roczny', start: iso(y, 0, 1), subtitle: `Rok ${y}` },
  ]
}

export default function GoalGate({ profile }: { profile: Profile }) {
  const periods = useMemo(currentPeriods, [])
  const gated = GATED_ROLES.includes(profile.role)

  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [needed, setNeeded] = useState<PeriodDef[]>([])
  const [idx, setIdx] = useState(0)
  const [mm, setMm] = useState('')
  const [contracts, setContracts] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(!gated)

  const find = (gs: Goal[], p: PeriodDef, metric: string) =>
    gs.find((g) => g.period === p.type && g.periodStart === p.start && g.metricType === metric) ?? null

  useEffect(() => {
    if (!gated) return
    listGoals(profile.id)
      .then((gs) => {
        setGoals(gs)
        const miss = periods.filter((p) => !find(gs, p, 'mm') || !find(gs, p, 'contracts'))
        setNeeded(miss)
        if (miss.length === 0) setDone(true)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [gated, profile.id, periods])

  // Prefill ze stanu częściowo ustawionych celów przy zmianie kroku.
  useEffect(() => {
    if (!goals || needed.length === 0 || idx >= needed.length) return
    const p = needed[idx]
    const exMM = find(goals, p, 'mm')
    const exC = find(goals, p, 'contracts')
    setMm(exMM?.target != null ? String(exMM.target) : '')
    setContracts(exC?.target != null ? String(exC.target) : '')
    setError(null)
  }, [goals, needed, idx])

  if (done) return null
  if (gated && goals === null && !error) return <Overlay>Sprawdzanie celów…</Overlay>
  if (needed.length === 0) return null

  const p = needed[idx]

  async function save() {
    if (!goals) return
    const mmVal = parseFloat(mm)
    const cVal = parseFloat(contracts)
    if (isNaN(mmVal) || mmVal <= 0) return setError('Podaj wartość Masy Marży (większą od 0).')
    if (isNaN(cVal) || cVal <= 0) return setError('Podaj liczbę umów (większą od 0).')
    setSaving(true)
    setError(null)
    try {
      const exMM = find(goals, p, 'mm')
      const exC = find(goals, p, 'contracts')
      await (exMM ? updateGoalTarget(exMM.id, mmVal) : createGoal({ userId: profile.id, period: p.type, periodStart: p.start, metricType: 'mm', target: mmVal, setBy: profile.id }))
      await (exC ? updateGoalTarget(exC.id, cVal) : createGoal({ userId: profile.id, period: p.type, periodStart: p.start, metricType: 'contracts', target: cVal, setBy: profile.id }))
      if (idx + 1 >= needed.length) setDone(true)
      else setIdx(idx + 1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl">
        <div className="mb-5 flex items-center justify-center gap-1.5">
          {needed.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? 'w-6 bg-violet-600' : i < idx ? 'w-6 bg-violet-300' : 'w-3 bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
            {p.label}
          </span>
          <h2 className="mt-3 text-xl font-bold text-slate-900">Ustaw cele na {p.subtitle}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Zanim przejdziesz dalej, określ swoje cele. Krok {idx + 1} z {needed.length}.
          </p>
        </div>

        <div className="space-y-4">
          <Labelled label="Masa Marży (PLN)">
            <input
              type="number"
              min="1"
              value={mm}
              onChange={(e) => setMm(e.target.value)}
              placeholder="np. 25000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base font-medium outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </Labelled>
          <Labelled label="Liczba umów">
            <input
              type="number"
              min="1"
              value={contracts}
              onChange={(e) => setContracts(e.target.value)}
              placeholder="np. 4"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base font-medium outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </Labelled>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? 'Zapisywanie…' : idx + 1 >= needed.length ? 'Zapisz i wejdź do panelu' : 'Dalej →'}
        </button>
      </div>
    </Overlay>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4 backdrop-blur-sm">
      {typeof children === 'string' ? <span className="text-slate-200">{children}</span> : children}
    </div>
  )
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  )
}
