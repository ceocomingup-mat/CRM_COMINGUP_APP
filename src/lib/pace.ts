/* ============================================================================
 *  pace.ts — ACT.2 · Tempo (Pace)
 * ----------------------------------------------------------------------------
 *  Pace = realizacja / (cel × % upływu okresu). Mówi „czy jesteś na ścieżce"
 *  niezależnie od tego, ile okresu zostało:
 *    ≥ 1  → idziesz w tempie lub przed planem,
 *    < 1  → jesteś z tyłu względem równomiernego rozkładu celu w czasie.
 *  (analogicznie do `_paceRatio` z prototypu).
 * ========================================================================== */

// Ułamek bieżącego miesiąca, który już upłynął (0..1).
export function elapsedFractionOfMonth(now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
  return Math.min(Math.max((now.getTime() - start) / (end - start), 0), 1)
}

// Współczynnik tempa. null, gdy brak celu lub okres ledwo się zaczął.
export function paceRatio(actual: number, goal: number | null, elapsed: number): number | null {
  if (!goal || goal <= 0 || elapsed <= 0.01) return null
  return actual / (goal * elapsed)
}

export interface PaceBadge {
  label: string
  cls: string
}

// Etykieta + kolor dla współczynnika tempa.
export function paceBadge(ratio: number | null): PaceBadge {
  if (ratio == null) return { label: 'brak celu', cls: 'bg-surface text-steel' }
  if (ratio >= 1.05) return { label: 'przed planem', cls: 'bg-go/15 text-go' }
  if (ratio >= 0.9) return { label: 'w tempie', cls: 'bg-go/15 text-go' }
  if (ratio >= 0.75) return { label: 'lekko z tyłu', cls: 'bg-warn/15 text-warn' }
  return { label: 'za planem', cls: 'bg-bad/15 text-bad' }
}
