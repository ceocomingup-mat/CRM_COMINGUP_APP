import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email

  return (
    <div className="max-w-3xl">
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
        </>
      )}

      <h2 className="mt-10 mb-3 text-lg font-semibold text-cream">Co dziś zrobić</h2>
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
      <div className="text-3xl font-bold text-cream">
        {value === null ? '…' : value < 0 ? '—' : value}
      </div>
      <div className="mt-1 text-sm text-steel">{label}</div>
    </div>
  )
}
