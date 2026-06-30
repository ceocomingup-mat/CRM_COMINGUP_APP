import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '../components/Layout'
import {
  listContests,
  listCommissions,
  listUsers,
  type Contest,
  type CommissionRow,
  type UserLite,
} from '../lib/repo'

function plUmowy(n: number): string {
  if (n === 1) return 'umowa'
  const t = n % 10, h = n % 100
  return t >= 2 && t <= 4 && (h < 10 || h >= 20) ? 'umowy' : 'umów'
}
function fmtDate(ts: string | null): string {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const MEDAL = ['🥇', '🥈', '🥉']

interface Standing {
  uid: string
  value: number
}

function standingsFor(c: Contest, comms: CommissionRow[]): Standing[] {
  const startD = c.startTs?.slice(0, 10)
  const endD = c.endTs?.slice(0, 10)
  const rel = comms.filter(
    (x) =>
      x.contractDate &&
      (!startD || x.contractDate >= startD) &&
      (!endD || x.contractDate <= endD),
  )
  const isMm = c.metric === 'mm'
  const byAdv = new Map<string, number>()
  for (const x of rel) {
    if (!x.advisorId) continue
    byAdv.set(x.advisorId, (byAdv.get(x.advisorId) ?? 0) + (isMm ? x.mmNetto : 1))
  }
  return [...byAdv.entries()]
    .map(([uid, value]) => ({ uid, value }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
}

export default function Zawody() {
  const profile = useProfile()
  const [contests, setContests] = useState<Contest[] | null>(null)
  const [comms, setComms] = useState<CommissionRow[]>([])
  const [users, setUsers] = useState<UserLite[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listContests(), listCommissions(), listUsers()])
      .then(([cs, cm, us]) => { setContests(cs); setComms(cm); setUsers(us) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const nameOf = useMemo(() => {
    const m = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]))
    return (id: string) => m.get(id) ?? '—'
  }, [users])

  const active = (contests ?? []).filter((c) => c.status === 'active')
  const closed = (contests ?? []).filter((c) => c.status === 'closed')

  function metricLabel(c: Contest) {
    return c.metric === 'mm' ? 'Masa Marży' : 'Liczba umów'
  }
  function fmtValue(c: Contest, v: number) {
    return c.metric === 'mm' ? `${v.toLocaleString('pl-PL')} zł` : `${v} ${plUmowy(v)}`
  }
  function rewards(c: Contest) {
    const chips: { label: string; tone: string }[] = []
    if (c.rewardBadge) chips.push({ label: `Odznaka „${c.rewardBadge}"`, tone: 'brass' })
    if (c.rewardCash && c.rewardCash > 0)
      chips.push({ label: `Premia ${c.rewardCash.toLocaleString('pl-PL')} zł`, tone: 'go' })
    if (c.rewardText) chips.push({ label: c.rewardText, tone: 'muted' })
    return chips
  }

  return (
    <div className="max-w-3xl">
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-brass">Rywalizacja</div>
      <h1 className="mt-1 text-2xl font-semibold text-cream">Zawody</h1>
      <p className="mt-1 text-steel">Konkursy struktury — ranking liczony z umów w okresie konkursu.</p>

      {error && (
        <p className="mt-6 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}
      {!contests && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}
      {contests && contests.length === 0 && (
        <p className="mt-6 rounded-lg bg-cardhi/60 px-3 py-2 text-sm text-muted">
          Brak ogłoszonych konkursów. Administrator może ogłosić zawody.
        </p>
      )}

      {/* Aktywne */}
      {active.map((c) => {
        const st = standingsFor(c, comms)
        return (
          <section key={c.id} className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="inline-block rounded-full bg-go/15 px-2 py-0.5 text-xs font-medium text-go">
                  Trwa
                </span>
                <h2 className="mt-2 font-display text-lg font-semibold text-cream">{c.title}</h2>
                <div className="mt-0.5 text-xs text-steel">
                  {metricLabel(c)} · {fmtDate(c.startTs)}–{fmtDate(c.endTs)}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rewards(c).map((r, i) => (
                  <span
                    key={i}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      r.tone === 'go'
                        ? 'bg-go/15 text-go'
                        : r.tone === 'brass'
                          ? 'bg-brass/15 text-brass'
                          : 'bg-surface text-muted'
                    }`}
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 divide-y divide-line">
              {st.length === 0 && (
                <p className="py-2 text-sm italic text-steel">Brak wyników w tym okresie.</p>
              )}
              {st.slice(0, 5).map((s, i) => {
                const me = s.uid === profile.id
                return (
                  <div
                    key={s.uid}
                    className={`flex items-center gap-3 py-2 ${me ? 'rounded-lg bg-brass/5 px-2' : ''}`}
                  >
                    <span className="w-7 text-center text-sm">
                      {MEDAL[i] ?? <span className="text-steel">{i + 1}</span>}
                    </span>
                    <span className="flex-1 text-sm text-cream">
                      {nameOf(s.uid)}
                      {me && <span className="ml-1 text-xs text-brass">· Ty</span>}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-brass">
                      {fmtValue(c, s.value)}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Zakończone */}
      {closed.length > 0 && (
        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-steel">Zakończone</h3>
      )}
      {closed.map((c) => (
        <section key={c.id} className="mt-3 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-cream">{c.title}</h2>
              <div className="mt-0.5 text-xs text-steel">
                {metricLabel(c)} · {fmtDate(c.startTs)}–{fmtDate(c.endTs)}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rewards(c).map((r, i) => (
                <span key={i} className="rounded-full bg-surface px-2.5 py-1 text-xs text-muted">
                  {r.label}
                </span>
              ))}
            </div>
          </div>
          {c.winnerId && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-brass/30 bg-brass/10 px-4 py-3">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="text-xs uppercase tracking-wide text-brass">Zwycięzca</div>
                <div className="font-display font-semibold text-cream">
                  {nameOf(c.winnerId)} — {fmtValue(c, c.winnerValue ?? 0)}
                </div>
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
