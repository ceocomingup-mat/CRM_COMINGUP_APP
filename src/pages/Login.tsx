import { useState } from 'react'
import { signIn, type Profile } from '../lib/supabase'

export default function Login({ onLoggedIn }: { onLoggedIn: (p: Profile) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
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

  return (
    <div className="min-h-svh grid place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-violet-600 text-xl font-bold text-white">
            C
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">ComingUP CRM</h1>
          <p className="text-sm text-slate-500">Zaloguj się do panelu</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">E-mail</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              placeholder="maria@comingup.pl"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Hasło</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {busy ? 'Logowanie…' : 'Zaloguj się'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Konta demo (hasło <code>demo123</code>): admin@ · marek@ · maria@comingup.pl
        </p>
      </div>
    </div>
  )
}
