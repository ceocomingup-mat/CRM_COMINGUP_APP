import { useState } from 'react'
import { signIn, requestPasswordReset, type Profile } from '../lib/supabase'

export default function Login({ onLoggedIn }: { onLoggedIn: (p: Profile) => void }) {
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const r = await signIn(email, password)
    setBusy(false)
    if (r.ok && r.profile) onLoggedIn(r.profile)
    else setError(r.error ?? 'Nie udało się zalogować.')
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null); setBusy(true)
    const r = await requestPasswordReset(email)
    setBusy(false)
    // Komunikat neutralny (nie zdradzamy czy konto istnieje).
    if (r.ok) setInfo('Jeśli konto istnieje, wysłaliśmy link do zmiany hasła. Sprawdź skrzynkę.')
    else setError(r.error ?? 'Nie udało się wysłać linku.')
  }

  return (
    <div className="min-h-svh grid place-items-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brass text-xl font-bold text-ink">
            C
          </div>
          <h1 className="text-2xl font-semibold text-cream">ComingUP CRM</h1>
          <p className="text-sm text-steel">
            {mode === 'login' ? 'Zaloguj się do panelu' : 'Resetowanie hasła'}
          </p>
        </div>

        <form
          onSubmit={mode === 'login' ? submit : submitReset}
          className="space-y-4 rounded-2xl border border-line bg-card p-6 shadow-sm"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-muted">E-mail</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line2 px-3 py-2 text-cream outline-none focus:border-brass focus:ring-2 focus:ring-brass/30"
              placeholder="maria@comingup.pl"
            />
          </label>

          {mode === 'login' && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-muted">Hasło</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line2 px-3 py-2 text-cream outline-none focus:border-brass focus:ring-2 focus:ring-brass/30"
                placeholder="••••••••"
              />
            </label>
          )}

          {error && (
            <p className="rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">{error}</p>
          )}
          {info && (
            <p className="rounded-lg bg-go/15 px-3 py-2 text-sm text-go">{info}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brass px-4 py-2.5 font-medium text-ink transition hover:bg-brass2 disabled:opacity-60"
          >
            {busy
              ? mode === 'login' ? 'Logowanie…' : 'Wysyłanie…'
              : mode === 'login' ? 'Zaloguj się' : 'Wyślij link resetujący'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'reset' : 'login')
              setError(null); setInfo(null)
            }}
            className="block w-full text-center text-xs text-steel transition hover:text-brass"
          >
            {mode === 'login' ? 'Nie pamiętasz hasła?' : '← Wróć do logowania'}
          </button>
        </form>

        {/* Podpowiedź kont demo TYLKO w trybie deweloperskim — nigdy w produkcyjnym
            buildzie (publiczny URL nie może zdradzać danych logowania). */}
        {import.meta.env.DEV && (
          <p className="mt-4 text-center text-xs text-steel">
            Konta demo (hasło <code>demo123</code>): admin@ · marek@ · maria@comingup.pl
          </p>
        )}
      </div>
    </div>
  )
}
