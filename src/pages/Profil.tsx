import { useEffect, useState } from 'react'
import { useProfile } from '../components/Layout'
import { getUser, updateProfile, type UserFull } from '../lib/repo'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator', dyrektor: 'Dyrektor', manager: 'Manager', doradca: 'Doradca',
}

export default function Profil() {
  const profile = useProfile()
  const [user, setUser] = useState<UserFull | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getUser(profile.id)
      .then((u) => { setUser(u); setPhone(u?.phone ?? '') })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [profile.id])

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    try {
      const u = await updateProfile(profile.id, { phone: phone.trim() || null })
      setUser(u); setEditing(false); setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
  const input =
    'w-full rounded-lg border border-line2 bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-brass focus:ring-2 focus:ring-brass/30'

  return (
    <div className="max-w-2xl">
      <div className="kicker">Konto</div>
      <h1 className="text-2xl font-semibold text-cream">Profil</h1>

      {error && (
        <p className="mt-4 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}
      {!user && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}

      {user && (
        <>
          {/* Nagłówek */}
          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brass/15 font-display text-xl font-bold text-brass">
              {initials || '?'}
            </div>
            <div>
              <div className="font-display text-xl font-semibold text-cream">
                {user.firstName} {user.lastName}
              </div>
              <span className="mt-1 inline-block rounded-full bg-brass/15 px-2 py-0.5 text-xs font-medium text-brass">
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>
          </div>

          {/* Dane */}
          <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 rounded-2xl border border-line bg-card p-5 text-sm shadow-sm sm:grid-cols-2">
            <Field label="E-mail" value={user.email} />
            <div>
              <div className="text-xs uppercase tracking-wide text-steel">Telefon</div>
              {editing ? (
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`${input} mt-1`} placeholder="np. 600 100 200" />
              ) : (
                <div className="mt-0.5 text-cream">{user.phone || '—'}</div>
              )}
            </div>
            <Field label="Ranga" value={user.rank} />
            <Field label="Stawka" value={`${user.rankPct}%`} />
            <div className="sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-steel">Województwa</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(user.provinces?.length ? user.provinces : ['—']).map((p) => (
                  <span key={p} className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{p}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            {editing ? (
              <>
                <button onClick={save} disabled={saving} className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-brass2 disabled:opacity-40">
                  {saving ? 'Zapisywanie…' : 'Zapisz'}
                </button>
                <button onClick={() => { setEditing(false); setPhone(user.phone ?? '') }} className="rounded-lg border border-line2 px-4 py-2 text-sm text-muted transition hover:bg-surface">
                  Anuluj
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="rounded-lg border border-line2 px-4 py-2 text-sm text-muted transition hover:bg-surface">
                Edytuj telefon
              </button>
            )}
            {saved && <span className="text-sm text-go">✓ Zapisano</span>}
          </div>

          <p className="mt-5 text-sm text-steel">
            Rolę, rangę, stawkę i strukturę zmienia administrator (chronione po stronie serwera).
          </p>
        </>
      )}
    </div>
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
