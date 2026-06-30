import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../components/Layout'
import {
  getMyStats,
  listClients,
  listCommissions,
  listCommissionMeta,
  type CommissionRow,
  type UserStats,
} from '../lib/repo'

const fmt = (n: number) => (n ? n.toLocaleString('pl-PL') + ' zł' : '—')
function fmtDate(v: string | null): string {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pl-PL')
}

export default function Umowy() {
  const profile = useProfile()
  const [rows, setRows] = useState<CommissionRow[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({}) // commissionId → klient
  const [stats, setStats] = useState<UserStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listCommissions(), listCommissionMeta(), listClients(), getMyStats(profile.id)])
      .then(([coms, meta, clients, st]) => {
        const clientName: Record<string, string> = {}
        for (const c of clients) clientName[c.id] = `${c.firstName} ${c.lastName}`.trim()
        const map: Record<string, string> = {}
        for (const m of meta) if (m.clientId) map[m.id] = clientName[m.clientId] ?? ''
        setNames(map)
        setRows(
          [...coms].sort((a, b) => (b.contractDate ?? '').localeCompare(a.contractDate ?? '')),
        )
        setStats(st)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [profile.id])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-cream">Umowy i prowizje</h1>
      <p className="mt-1 text-steel">Twoje umowy, transze i zarobki — zakres wg RLS.</p>

      {error && (
        <p className="mt-6 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}

      {/* Podsumowanie */}
      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Zarobione łącznie" value={fmt(stats.ownTranchesTotal)} accent />
          <Stat label="Wypłacone" value={fmt(stats.ownTranchesPaid)} tone="go" />
          <Stat label="W grze" value={fmt(stats.ownTranchesInPlay)} tone="warn" />
          <Stat label="Z override (struktura)" value={fmt(stats.overrideIncomeTotal)} />
        </div>
      )}

      {!rows && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}
      {rows && rows.length === 0 && (
        <p className="mt-6 rounded-2xl border border-line bg-card px-5 py-4 text-steel">
          Brak umów w Twoim zakresie.
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3 font-medium">Klient</th>
                <th className="px-4 py-3 text-right font-medium">MM</th>
                <th className="px-4 py-3 text-right font-medium">Stawka</th>
                <th className="px-4 py-3 text-right font-medium">Prowizja</th>
                <th className="px-4 py-3 font-medium">I transza</th>
                <th className="px-4 py-3 font-medium">II transza</th>
                <th className="px-4 py-3 text-right font-medium">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-cream">{names[c.id] || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{fmt(c.mmNetto)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{c.rate}%</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-brass">
                    {fmt(c.totalTranches)}
                  </td>
                  <td className="px-4 py-3">
                    <TrancheCell amount={c.t1Amount} paid={c.t1Paid} due={c.t1DueDate} />
                  </td>
                  <td className="px-4 py-3">
                    <TrancheCell amount={c.t2Amount} paid={c.t2Paid} due={c.t2DueDate} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {c.overrideTotal ? fmt(c.overrideTotal) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-steel">
        Kwoty liczy serwerowy silnik prowizji. Sprawdź własny scenariusz w{' '}
        <Link to="/kalkulator" className="text-brass hover:underline">
          kalkulatorze
        </Link>
        .
      </p>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
  tone,
}: {
  label: string
  value: string
  accent?: boolean
  tone?: 'go' | 'warn'
}) {
  const color = accent ? 'text-brass' : tone === 'go' ? 'text-go' : tone === 'warn' ? 'text-warn' : 'text-cream'
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className={`font-display text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-sm text-steel">{label}</div>
    </div>
  )
}

function TrancheCell({
  amount,
  paid,
  due,
}: {
  amount: number | null
  paid: boolean | null
  due: string | null
}) {
  if (amount == null) return <span className="text-steel">—</span>
  return (
    <div>
      <span className="tabular-nums text-cream">{fmt(amount)}</span>
      <span
        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
          paid ? 'bg-go/15 text-go' : 'bg-warn/15 text-warn'
        }`}
      >
        {paid ? 'wypłacona' : 'w grze'}
      </span>
      {!paid && due && <div className="mt-0.5 text-xs text-steel">termin {fmtDate(due)}</div>}
    </div>
  )
}
