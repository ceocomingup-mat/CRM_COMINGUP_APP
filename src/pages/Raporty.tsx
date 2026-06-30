import { useCallback, useEffect, useState } from 'react'
import { useProfile } from '../components/Layout'
import { listMonthReport, subscribeReports, type MonthReportRow } from '../lib/repo'
import { elapsedFractionOfMonth, paceBadge, paceRatio } from '../lib/pace'

const ROLE_ORDER: Record<string, number> = { admin: 0, dyrektor: 1, manager: 2, doradca: 3 }
const MANAGER_PLUS = ['admin', 'dyrektor', 'manager']

const PL_MONTHS = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
]

function fmtMM(v: number): string {
  return v.toLocaleString('pl-PL') + ' zł'
}
function pct(actual: number, goal: number | null): number | null {
  if (!goal || goal <= 0) return null
  return Math.round((actual / goal) * 100)
}
function barColor(p: number | null): string {
  if (p == null) return 'bg-line2'
  if (p >= 100) return 'bg-go'
  if (p >= 60) return 'bg-warn'
  return 'bg-bad'
}

function PaceTag({ ratio }: { ratio: number | null }) {
  const b = paceBadge(ratio)
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${b.cls}`}>
      {b.label}
    </span>
  )
}

function Progress({ actual, goal, fmt }: { actual: number; goal: number | null; fmt: (n: number) => string }) {
  const p = pct(actual, goal)
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-cream">{fmt(actual)}</span>
        <span className="text-steel">{goal != null ? `/ ${fmt(goal)}` : 'brak celu'}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full ${barColor(p)}`}
          style={{ width: `${Math.min(p ?? 0, 100)}%` }}
        />
      </div>
      {p != null && (
        <div className={`mt-0.5 text-xs ${p >= 100 ? 'text-go' : 'text-steel'}`}>
          {p}%
        </div>
      )}
    </div>
  )
}

export default function Raporty() {
  const profile = useProfile()
  const [rows, setRows] = useState<MonthReportRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)

  const allowed = MANAGER_PLUS.includes(profile.role)
  const now = new Date()
  const monthLabel = `${PL_MONTHS[now.getMonth()]} ${now.getFullYear()}`
  const elapsed = elapsedFractionOfMonth(now)

  const load = useCallback(() => {
    listMonthReport()
      .then((rs) =>
        setRows(
          [...rs].sort(
            (a, b) =>
              (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) ||
              `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'pl'),
          ),
        ),
      )
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    if (!allowed) return
    load()
    const unsub = subscribeReports(load)
    setLive(true)
    return () => {
      setLive(false)
      unsub()
    }
  }, [allowed, load])

  if (!allowed)
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-cream">Raporty</h1>
        <p className="mt-4 rounded-lg bg-warn/15 px-3 py-2 text-sm text-warn">
          Ten widok jest dostępny dla managerów, dyrektorów i administratorów.
        </p>
      </div>
    )

  const totals = rows?.reduce(
    (acc, r) => {
      acc.goalMm += r.goalMm ?? 0
      acc.actualMm += r.actualMm
      acc.goalContracts += r.goalContracts ?? 0
      acc.actualContracts += r.actualContracts
      return acc
    },
    { goalMm: 0, actualMm: 0, goalContracts: 0, actualContracts: 0 },
  )

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-cream">Raport miesięczny</h1>
          <p className="mt-1 text-steel">Cel vs realizacja struktury — {monthLabel}</p>
        </div>
        {live && (
          <span className="inline-flex items-center gap-1.5 text-sm text-go">
            <span className="h-1.5 w-1.5 rounded-full bg-go" />
            na żywo
          </span>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">
          Błąd wczytywania: {error}
        </p>
      )}
      {!rows && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}

      {rows && totals && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-steel">
                  Masa Marży — struktura
                </div>
                <PaceTag ratio={paceRatio(totals.actualMm, totals.goalMm || null, elapsed)} />
              </div>
              <Progress actual={totals.actualMm} goal={totals.goalMm || null} fmt={fmtMM} />
            </div>
            <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-steel">
                  Umowy — struktura
                </div>
                <PaceTag ratio={paceRatio(totals.actualContracts, totals.goalContracts || null, elapsed)} />
              </div>
              <Progress
                actual={totals.actualContracts}
                goal={totals.goalContracts || null}
                fmt={(n) => String(n)}
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3 font-medium">Osoba</th>
                  <th className="px-4 py-3 font-medium">Masa Marży (cel / realizacja)</th>
                  <th className="px-4 py-3 font-medium">Umowy (cel / realizacja)</th>
                  <th className="px-4 py-3 font-medium">Tempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.userId} className="hover:bg-surface">
                    <td className="px-4 py-3 align-top font-medium text-cream">
                      {r.firstName} {r.lastName}
                      {r.userId === profile.id && (
                        <span className="ml-2 rounded-full bg-brass/15 px-2 py-0.5 text-xs text-brass">
                          Ty
                        </span>
                      )}
                    </td>
                    <td className="w-1/3 px-4 py-3">
                      <Progress actual={r.actualMm} goal={r.goalMm} fmt={fmtMM} />
                    </td>
                    <td className="px-4 py-3">
                      <Progress actual={r.actualContracts} goal={r.goalContracts} fmt={(n) => String(n)} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <PaceTag ratio={paceRatio(r.actualMm, r.goalMm, elapsed)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-steel">
            Realizacja = umowy i MM z bieżącego miesiąca (silnik prowizji), cele z modułu celów.
            Zakres wg RLS; dane odświeżają się na żywo.
          </p>
        </>
      )}
    </div>
  )
}
