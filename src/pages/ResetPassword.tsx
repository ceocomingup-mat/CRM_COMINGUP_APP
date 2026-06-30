import { useState } from 'react'
import { updatePassword, signOut } from '../lib/supabase'

/* Ekran ustawienia nowego hasła po kliknięciu linku z e-maila (recovery).
 * Pokazywany przez App po zdarzeniu PASSWORD_RECOVERY, niezależnie od profilu. */
export default function ResetPassword({ onDone }: { onDone: () => void }) {
  const [next, setNext] = useState('')
  const [conf, setConf] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const tooShort = next.length > 0 && next.length < 8
  const mismatch = conf.length > 0 && next !== conf
  const canSave = next.length >= 8 && next === conf && !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setBusy(true); setError(null)
    const r = await updatePassword(next)
    setBusy(false)
    if (!r.ok) { setError(r.error ?? 'Nie udało się ustawić hasła.'); return }
    setDone(true)
    await signOut() // recovery-sesja → wyloguj, niech zaloguje się nowym hasłem
  }

  const input =
    'w-full rounded-lg border border-line2 bg-bg px-3 py-2 text-cream outline-none focus:border-brass focus:ring-2 focus:ring-brass/30'

  return (
    <div className="min-h-svh grid place-items-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brass text-xl font-bold text-ink">
            C
          </div>
          <h1 className="text-2xl font-semibold text-cream">Ustaw nowe hasło</h1>
          <p className="text-sm text-steel">Dla konta z linku resetującego</p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-line bg-card p-6 text-center shadow-sm">
            <div className="text-3xl">✅</div>
            <p className="mt-3 text-sm text-cream">Hasło zostało zmienione.</p>
            <button
              onClick={onDone}
              className="mt-5 w-full rounded-lg bg-brass px-4 py-2.5 font-medium text-ink transition hover:bg-brass2"
            >
              Przejdź do logowania
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-card p-6 shadow-sm">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-muted">Nowe hasło</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="min. 8 znaków"
                className={input}
              />
              {tooShort && <p className="mt-1 text-xs text-warn">Hasło musi mieć min. 8 znaków.</p>}
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-muted">Powtórz hasło</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={conf}
                onChange={(e) => setConf(e.target.value)}
                placeholder="••••••••"
                className={input}
              />
              {mismatch && <p className="mt-1 text-xs text-bad">Hasła nie są identyczne.</p>}
            </label>

            {error && <p className="rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">{error}</p>}

            <button
              type="submit"
              disabled={!canSave}
              className="w-full rounded-lg bg-brass px-4 py-2.5 font-medium text-ink transition hover:bg-brass2 disabled:opacity-50"
            >
              {busy ? 'Zapisywanie…' : 'Ustaw hasło'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
