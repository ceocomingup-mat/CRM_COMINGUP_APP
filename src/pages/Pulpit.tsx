import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { visibleCount } from '../lib/supabase'
import {
  listTasks,
  listClients,
  listMonthReport,
  listTeamPipeline,
  type Task,
  type MonthReportRow,
} from '../lib/repo'
import { useProfile } from '../components/Layout'
import { elapsedFractionOfMonth, paceBadge, paceRatio } from '../lib/pace'

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Wysoki',
  medium: 'Średni',
  normal: 'Normalny',
  low: 'Niski',
}
const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-bad/15 text-bad',
  medium: 'bg-warn/15 text-warn',
  normal: 'bg-surface text-muted',
  low: 'bg-surface text-steel',
}

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Policz zadania wg terminu (zaległe / dziś / wkrótce).
function taskCounts(tasks: Task[]): { overdue: number; today: number; upcoming: number } {
  let overdue = 0, today = 0, upcoming = 0
  for (const t of tasks) {
    if (!t.dueDate) { upcoming++; continue }
    const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0)
    const diff = d.getTime() - startOfToday()
    if (diff < 0) overdue++
    else if (diff === 0) today++
    else upcoming++
  }
  return { overdue, today, upcoming }
}

function dueInfo(due: string | null): { label: string; cls: string } {
  if (!due) return { label: 'bez terminu', cls: 'text-steel' }
  const d = new Date(due)
  if (isNaN(d.getTime())) return { label: '', cls: 'text-steel' }
  const day = new Date(d)
  day.setHours(0, 0, 0, 0)
  const diff = day.getTime() - startOfToday()
  const fmt = d.toLocaleDateString('pl-PL')
  if (diff < 0) return { label: `zaległe · ${fmt}`, cls: 'text-bad' }
  if (diff === 0) return { label: 'dziś', cls: 'text-warn' }
  return { label: fmt, cls: 'text-steel' }
}

export default function Pulpit() {
  const profile = useProfile()
  const [clients, setClients] = useState<number | null>(null)
  const [leads, setLeads] = useState<number | null>(null)
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [clientNames, setClientNames] = useState<Record<string, string>>({})
  const [myReport, setMyReport] = useState<MonthReportRow | null>(null)
  const [recruits, setRecruits] = useState<number>(0)
  const [showBrief, setShowBrief] = useState(false)

  useEffect(() => {
    visibleCount('clients').then(setClients)
    visibleCount('leads').then(setLeads)
    listMonthReport()
      .then((rs) => setMyReport(rs.find((r) => r.userId === profile.id) ?? null))
      .catch(() => setMyReport(null))
    listTeamPipeline()
      .then((rs) => setRecruits(rs.find((r) => r.userId === profile.id)?.recruits ?? 0))
      .catch(() => setRecruits(0))
    Promise.all([listTasks(), listClients()]).then(([ts, cs]) => {
      const map: Record<string, string> = {}
      for (const c of cs) map[c.id] = `${c.firstName} ${c.lastName}`.trim()
      setClientNames(map)
      const mine = ts
        .filter((t) => t.status === 'pending')
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
      setTasks(mine)
    })
  }, [profile.id])

  // Poranny brief — pokaż raz dziennie po wczytaniu zadań.
  useEffect(() => {
    if (!tasks) return
    const key = `cu-brief-${new Date().toISOString().slice(0, 10)}`
    if (!localStorage.getItem(key)) {
      setShowBrief(true)
      localStorage.setItem(key, '1')
    }
  }, [tasks])

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email

  return (
    <div className="max-w-3xl">
      {showBrief && tasks && (
        <MorningBrief
          name={fullName}
          ratio={myReport ? overallPace(myReport) : null}
          tasks={tasks}
          onClose={() => setShowBrief(false)}
        />
      )}
      <div className="kicker">Pulpit</div>
      <h1 className="text-2xl font-semibold text-cream">Cześć, {fullName} 👋</h1>
      <p className="mt-1 text-steel">Pulpit — przegląd Twoich danych.</p>

      <div className={`mt-8 grid gap-4 ${recruits > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <StatCard label="Klienci (widoczni)" value={clients} />
        <StatCard label="Leady (widoczne)" value={leads} />
        {recruits > 0 && <StatCard label="Zrekrutowani (struktura)" value={recruits} />}
      </div>

      {myReport && (myReport.goalMm != null || myReport.goalContracts != null) && (
        <>
          <h2 className="mt-10 mb-3 text-lg font-semibold text-cream">
            Twoje tempo — ten miesiąc
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,260px)_1fr]">
            <PaceGauge ratio={overallPace(myReport)} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PaceCard
                label="Masa Marży"
                actual={myReport.actualMm}
                goal={myReport.goalMm}
                fmt={(n) => n.toLocaleString('pl-PL') + ' zł'}
              />
              <PaceCard
                label="Umowy"
                actual={myReport.actualContracts}
                goal={myReport.goalContracts}
                fmt={(n) => String(n)}
              />
            </div>
          </div>
        </>
      )}

      <div className="mt-10 mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-cream">Co dziś zrobić</h2>
        {tasks && tasks.length > 0 && (() => {
          const c = taskCounts(tasks)
          const pill = (n: number, label: string, color: string) =>
            n > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-steel">
                <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ${color}`}>{n}</span>
                {label}
              </span>
            ) : null
          return (
            <div className="flex items-center gap-3">
              {pill(c.overdue, 'zaległe', 'bg-bad/20 text-bad')}
              {pill(c.today, 'na dziś', 'bg-warn/20 text-warn')}
              {pill(c.upcoming, 'wkrótce', 'bg-surface text-muted')}
            </div>
          )
        })()}
      </div>
      {!tasks && <p className="text-steel">Wczytywanie…</p>}
      {tasks && tasks.length === 0 && (
        <p className="rounded-2xl border border-line bg-card px-5 py-4 text-steel shadow-sm">
          Brak zadań do zrobienia. 🎉
        </p>
      )}
      {tasks && tasks.length > 0 && (
        <ul className="space-y-2">
          {tasks.map((t) => {
            const di = dueInfo(t.dueDate)
            return (
              <li
                key={t.id}
                className="rounded-2xl border border-line bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-cream">{t.title}</div>
                    {t.notes && (
                      <div className="mt-0.5 text-sm text-steel">{t.notes}</div>
                    )}
                    {t.clientId && clientNames[t.clientId] && (
                      <Link
                        to={`/klienci/${t.clientId}`}
                        className="mt-1 inline-block text-sm text-brass hover:underline"
                      >
                        Klient: {clientNames[t.clientId]}
                      </Link>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        PRIORITY_STYLE[t.priority] ?? 'bg-surface text-muted'
                      }`}
                    >
                      {PRIORITY_LABEL[t.priority] ?? t.priority}
                    </span>
                    <span className={`text-xs font-medium ${di.cls}`}>{di.label}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-6 text-sm text-steel">
        Liczby i zadania zależą od Twojej roli — ochrona danych (RLS) pilnuje, że
        doradca widzi mniej niż dyrektor, a dyrektor mniej niż admin.
      </p>
    </div>
  )
}

// Poranny brief — modal powitalny (raz dziennie), jak w prototypie.
function MorningBrief({
  name, ratio, tasks, onClose,
}: { name: string; ratio: number | null; tasks: Task[]; onClose: () => void }) {
  const c = taskCounts(tasks)
  const b = paceBadge(ratio)
  const dateStr = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  const top = tasks.slice(0, 3)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="kicker">Poranny brief</div>
            <h2 className="font-display text-xl font-semibold text-cream">Dzień dobry, {name.split(' ')[0]}!</h2>
            <div className="mt-0.5 text-sm capitalize text-steel">{dateStr}</div>
          </div>
          <button onClick={onClose} aria-label="Zamknij" className="text-steel hover:text-cream">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.cls}`}>{b.label}</span>
          {ratio != null && (
            <span className="text-sm text-steel">
              {ratio >= 1 ? '+' : ''}{Math.round((ratio - 1) * 100)}% względem planu
            </span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <BriefStat n={c.overdue} label="Zaległe" tone="bad" />
          <BriefStat n={c.today} label="Na dziś" tone="warn" />
          <BriefStat n={c.upcoming} label="Wkrótce" tone="steel" />
        </div>
        {top.length > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-wide text-steel">Na start</div>
            <ul className="mt-2 space-y-1.5">
              {top.map((t) => (
                <li key={t.id} className="truncate text-sm text-muted">• {t.title}</li>
              ))}
            </ul>
          </div>
        )}
        <button onClick={onClose} className="mt-6 w-full rounded-lg bg-brass px-4 py-2.5 font-medium text-ink transition hover:bg-brass2">
          Zaczynamy!
        </button>
      </div>
    </div>
  )
}
function BriefStat({ n, label, tone }: { n: number; label: string; tone: 'bad' | 'warn' | 'steel' }) {
  const color = tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-steel'
  return (
    <div className="rounded-xl border border-line bg-bg p-3 text-center">
      <div className={`font-display text-2xl font-bold ${color}`}>{n}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-steel">{label}</div>
    </div>
  )
}

// Łączne tempo = średnia ze wskaźników MM i umów (te, dla których jest cel).
function overallPace(r: MonthReportRow): number | null {
  const e = elapsedFractionOfMonth()
  const ratios = [
    paceRatio(r.actualMm, r.goalMm, e),
    paceRatio(r.actualContracts, r.goalContracts, e),
  ].filter((x): x is number => x != null)
  return ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null
}

// Radialny wskaźnik tempa (jak „PLAN" w prototypie): igła + % w środku.
function PaceGauge({ ratio }: { ratio: number | null }) {
  const cx = 110, cy = 110, r = 84
  const frac = ratio == null ? 0.5 : Math.min(Math.max((ratio - 0.5) / 1.0, 0), 1)
  const ang = ((180 - frac * 180) * Math.PI) / 180
  const nx = cx + r * 0.72 * Math.cos(ang)
  const ny = cy - r * 0.72 * Math.sin(ang)
  const b = paceBadge(ratio)
  const color =
    ratio == null ? '#828d9b' : ratio >= 0.9 ? '#33cf86' : ratio >= 0.75 ? '#e6ad42' : '#ef5b60'
  const pct = ratio == null ? '—' : `${ratio >= 1 ? '+' : ''}${Math.round((ratio - 1) * 100)}%`
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-card p-5 shadow-sm">
      <svg viewBox="0 0 220 128" className="w-full max-w-[240px]">
        <path d={arc} fill="none" stroke="#3b4552" strokeWidth="12" strokeLinecap="round" />
        {ratio != null && (
          <path
            d={arc}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${frac * 100} 100`}
          />
        )}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={color} />
        <text
          x={cx}
          y={cy - 24}
          textAnchor="middle"
          style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 30, fill: '#f6f4ef' }}
        >
          {pct}
        </text>
      </svg>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">Tempo vs plan</div>
      <span className={`mt-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${b.cls}`}>{b.label}</span>
    </div>
  )
}

function PaceCard({
  label,
  actual,
  goal,
  fmt,
}: {
  label: string
  actual: number
  goal: number | null
  fmt: (n: number) => string
}) {
  const ratio = paceRatio(actual, goal, elapsedFractionOfMonth())
  const b = paceBadge(ratio)
  const progress = goal && goal > 0 ? Math.min(Math.round((actual / goal) * 100), 100) : 0
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.cls}`}>{b.label}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-cream">{fmt(actual)}</span>
        <span className="text-steel">{goal != null ? `cel ${fmt(goal)}` : 'brak celu'}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full ${ratio != null && ratio >= 1 ? 'bg-go' : 'bg-brass'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="font-display text-4xl font-bold tabular-nums text-cream">
        {value === null ? '…' : value < 0 ? '—' : value}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-steel">{label}</div>
    </div>
  )
}
