import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../components/Layout'
import { getUser, changePassword, geocodeAddress, updateHomeBase, type UserFull } from '../lib/repo'

// PostgREST/Supabase rzuca surowy obiekt {message,...}, nie Error → wyciągnij message.
function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

export default function Ustawienia() {
  const profile = useProfile()
  const [user, setUser] = useState<UserFull | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getUser(profile.id)
      .then(setUser)
      .catch((e: unknown) => setError(errMsg(e)))
  }, [profile.id])

  return (
    <div className="max-w-2xl">
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-brass">Konto</div>
      <h1 className="mt-1 text-2xl font-semibold text-cream">Ustawienia</h1>

      {error && (
        <p className="mt-4 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}

      <Security />

      {user && <HomeBase user={user} onSaved={setUser} />}

      {/* Dane kontaktowe — edycja telefonu jest w Profilu */}
      <section className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="text-sm font-semibold text-cream">Dane kontaktowe</div>
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
          <Field label="E-mail" value={profile.email} />
          <Field label="Telefon" value={user?.phone ?? null} />
        </div>
        <p className="mt-4 text-xs text-steel">
          Telefon zmieniasz w{' '}
          <Link to="/profil" className="text-brass hover:underline">
            Profilu
          </Link>
          . Zmianę adresu e-mail przeprowadza administrator.
        </p>
      </section>

      {/* Regiony (województwa) — read-only, zmienia admin */}
      <section className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-cream">Regiony (województwa)</div>
          <span className="text-xs text-steel">Zmienia administrator</span>
        </div>
        <p className="mt-1 text-xs text-steel">Województwa, z których widzisz leady z bazy.</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {user?.provinces?.length ? (
            user.provinces.map((p) => (
              <span key={p} className="rounded-full bg-surface px-2.5 py-1 text-xs text-muted">
                {p === 'all' ? 'Wszystkie województwa' : p}
              </span>
            ))
          ) : (
            <span className="text-xs italic text-steel">Brak przypisanych województw</span>
          )}
        </div>
      </section>
    </div>
  )
}

function HomeBase({ user, onSaved }: { user: UserFull; onSaved: (u: UserFull) => void }) {
  const [addr, setAddr] = useState(user.homeAddress ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const geocoded = user.homeAddress != null && user.homeLat != null && user.homeLng != null

  async function save() {
    setSaving(true); setErr(null); setDone(false)
    try {
      const trimmed = addr.trim()
      if (!trimmed) {
        const u = await updateHomeBase(user.id, { homeAddress: null, homeLat: null, homeLng: null })
        onSaved(u); setDone(true)
      } else {
        const geo = await geocodeAddress(trimmed)
        if (!geo) {
          setErr('Nie udało się odnaleźć adresu — sprawdź pisownię (np. „ul. Morska 12, 80-001 Gdańsk").')
          return
        }
        const u = await updateHomeBase(user.id, {
          homeAddress: geo.placeName,
          homeLat: geo.lat,
          homeLng: geo.lng,
        })
        onSaved(u); setAddr(geo.placeName); setDone(true)
      }
      setTimeout(() => setDone(false), 3000)
    } catch (e: unknown) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  const input =
    'w-full rounded-lg border border-line2 bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-brass focus:ring-2 focus:ring-brass/30'

  return (
    <section className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-cream">Adres bazy dojazdu</div>
        <span className="text-xs text-steel">Zmieniasz samodzielnie</span>
      </div>
      <p className="mt-1 text-xs text-steel">
        Miejsce, z którego wyjeżdżasz do klientów. Po zapisaniu policzę dystans i czas dojazdu do
        każdego klienta na mapie.
      </p>
      <div className="mt-4 max-w-md space-y-2">
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="ul. Morska 12, 80-001 Gdańsk"
          className={input}
        />
        {err && <p className="rounded-lg bg-bad/15 px-3 py-2 text-xs text-bad">{err}</p>}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-brass2 disabled:opacity-40"
          >
            {saving ? 'Koduję…' : 'Zapisz adres'}
          </button>
          {done && <span className="text-sm text-go">✓ Zapisano</span>}
          {!done && geocoded && (
            <span className="text-xs font-medium text-go">Adres zakodowany — dystanse aktywne</span>
          )}
        </div>
      </div>
    </section>
  )
}

function Security() {
  const [next, setNext] = useState('')
  const [conf, setConf] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const tooShort = next.length > 0 && next.length < 6
  const mismatch = conf.length > 0 && next !== conf
  const canSave = next.length >= 6 && next === conf && !saving

  async function save() {
    if (!canSave) return
    setSaving(true); setErr(null); setDone(false)
    try {
      await changePassword(next)
      setNext(''); setConf(''); setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (e: unknown) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  const input =
    'w-full rounded-lg border border-line2 bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-brass focus:ring-2 focus:ring-brass/30'

  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="text-sm font-semibold text-cream">Bezpieczeństwo</div>
      <div className="mt-4 max-w-sm space-y-3">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-steel">Nowe hasło</label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="min. 6 znaków"
            autoComplete="new-password"
            className={input}
          />
          {tooShort && <p className="mt-1 text-xs text-warn">Hasło musi mieć min. 6 znaków.</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-steel">Powtórz nowe hasło</label>
          <input
            type="password"
            value={conf}
            onChange={(e) => setConf(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className={input}
          />
          {mismatch && <p className="mt-1 text-xs text-bad">Hasła nie są identyczne.</p>}
        </div>
        {err && <p className="rounded-lg bg-bad/15 px-3 py-2 text-xs text-bad">Błąd: {err}</p>}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={!canSave}
            className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-brass2 disabled:opacity-40"
          >
            {saving ? 'Zapisywanie…' : 'Zmień hasło'}
          </button>
          {done && <span className="text-sm text-go">✓ Hasło zmienione</span>}
        </div>
      </div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-0.5 text-cream">{value || '—'}</div>
    </div>
  )
}
