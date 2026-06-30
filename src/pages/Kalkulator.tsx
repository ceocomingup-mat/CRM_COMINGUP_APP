import { useMemo, useState } from 'react'

// Wzór 1:1 z silnikiem B13 (supabase/functions/_shared/money.ts):
//   I transza  = round(min(2500, MM) × stawka% )
//   II transza = round(max(0, MM − 2500) × stawka%)
const TRANCHE_BASE = 2500
const round = (x: number) => Math.round(x)
const fmt = (n: number) => n.toLocaleString('pl-PL') + ' zł'

export default function Kalkulator() {
  const [mm, setMm] = useState('9500')
  const [rate, setRate] = useState('40')

  const r = useMemo(() => {
    const M = Math.max(0, parseFloat(mm) || 0)
    const R = Math.max(0, parseFloat(rate) || 0)
    const t1 = round((Math.min(TRANCHE_BASE, M) * R) / 100)
    const t2 = round((Math.max(0, M - TRANCHE_BASE) * R) / 100)
    return { M, R, t1, t2, total: t1 + t2 }
  }, [mm, rate])

  const input =
    'w-full rounded-lg border border-line2 bg-bg px-3 py-2.5 text-base font-medium text-cream outline-none focus:border-brass focus:ring-2 focus:ring-brass/30'

  return (
    <div className="max-w-2xl">
      <div className="kicker">Motywacja</div>
      <h1 className="text-2xl font-semibold text-cream">Kalkulator prowizji</h1>
      <p className="mt-1 text-steel">
        Policz prowizję z Masy Marży i swojej stawki — wzór jak w silniku rozliczeń.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-steel">
            Masa Marży (PLN)
          </span>
          <input type="number" min="0" value={mm} onChange={(e) => setMm(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-steel">
            Twoja stawka (%)
          </span>
          <input type="number" min="0" step="0.5" value={rate} onChange={(e) => setRate(e.target.value)} className={input} />
        </label>
      </div>

      {/* Wynik */}
      <div className="mt-6 rounded-2xl border border-line bg-card p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-steel">Prowizja łącznie</span>
          <span className="font-display text-3xl font-bold text-brass">{fmt(r.total)}</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Tranche
            label="I transza"
            hint={`od pierwszych ${TRANCHE_BASE.toLocaleString('pl-PL')} zł MM`}
            value={r.t1}
          />
          <Tranche
            label="II transza"
            hint="od reszty MM (powyżej 2500 zł)"
            value={r.t2}
          />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-card/60 p-5 text-sm text-muted">
        <div className="mb-2 font-medium text-cream">Jak to liczymy</div>
        <ul className="space-y-1.5 text-steel">
          <li>• <span className="text-muted">I transza</span> = min(2500; MM) × stawka% — płatna 10. dnia następnego miesiąca po wgraniu umowy (E7).</li>
          <li>• <span className="text-muted">II transza</span> = (MM − 2500) × stawka% — płatna 2 miesiące po I transzy (po montażu, E10).</li>
          <li>• Kwoty zaokrąglane do pełnej złotówki; weekend terminu → piątek.</li>
        </ul>
      </div>
    </div>
  )
}

function Tranche({ label, hint, value }: { label: string; hint: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-bg/40 p-4">
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 font-display text-xl font-bold text-cream">{fmt(value)}</div>
      <div className="mt-1 text-xs text-steel">{hint}</div>
    </div>
  )
}
