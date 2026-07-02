/* ============================================================================
 *  zawody.ts — wspólna logika programów motywacyjnych (contests)
 * ----------------------------------------------------------------------------
 *  Ranking liczony z umów (commissions) w oknie konkursu. Współdzielone przez
 *  widok Zawody (doradcy) i panel admina (tworzenie/zamykanie programów).
 *  Daty: granice okna i wyświetlanie w Europe/Warsaw (D-B13-TZ, DECISIONS.md).
 * ========================================================================== */
import type { Contest, CommissionRow } from './repo'

export function plUmowy(n: number): string {
  if (n === 1) return 'umowa'
  const t = n % 10, h = n % 100
  return t >= 2 && t <= 4 && (h < 10 || h >= 20) ? 'umowy' : 'umów'
}

/* Dzień lokalny (Europe/Warsaw) z timestamptz — 'YYYY-MM-DD' (sv-SE = ISO). */
export function localDay(ts: string | null): string | null {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' })
}

export function fmtDate(ts: string | null): string {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Warsaw',
  })
}

export interface Standing {
  uid: string
  value: number
}

/* Ranking konkursu: umowy z contract_date w oknie [start, end] dnia lokalnego. */
export function standingsFor(c: Contest, comms: CommissionRow[]): Standing[] {
  const startD = localDay(c.startTs)
  const endD = localDay(c.endTs)
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

export function metricLabel(c: Contest): string {
  return c.metric === 'mm' ? 'Masa Marży' : 'Liczba umów'
}

export function fmtValue(c: Contest, v: number): string {
  return c.metric === 'mm' ? `${v.toLocaleString('pl-PL')} zł` : `${v} ${plUmowy(v)}`
}
