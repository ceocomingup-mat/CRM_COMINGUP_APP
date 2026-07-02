import { useEffect, useState } from 'react'
import { useProfile } from '../components/Layout'
import { listAllUsers, adminUpdateUser, type UserFull } from '../lib/repo'
import AdminZawody from '../components/AdminZawody'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator', dyrektor: 'Dyrektor', manager: 'Manager', doradca: 'Doradca',
}
const ROLE_ORDER: Record<string, number> = { admin: 0, dyrektor: 1, manager: 2, doradca: 3 }

export default function Admin() {
  const profile = useProfile()
  const isAdmin = profile.role === 'admin'
  const [tab, setTab] = useState<'konta' | 'zawody'>('konta')
  const [users, setUsers] = useState<UserFull[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  function load() {
    listAllUsers()
      .then((us) =>
        setUsers(
          [...us].sort(
            (a, b) =>
              (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) ||
              `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'pl'),
          ),
        ),
      )
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }
  useEffect(() => { if (isAdmin) load() }, [isAdmin])

  if (!isAdmin)
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-cream">Administracja</h1>
        <p className="mt-4 rounded-lg bg-warn/15 px-3 py-2 text-sm text-warn">
          Panel administracyjny jest dostępny tylko dla administratorów.
        </p>
      </div>
    )

  return (
    <div className="max-w-3xl">
      <div className="kicker">Administracja</div>
      <h1 className="text-2xl font-semibold text-cream">Administracja</h1>

      <div className="mt-4 flex gap-1 rounded-xl bg-surface p-1 text-sm w-fit">
        {(['konta', 'zawody'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 font-medium capitalize transition ${
              tab === t ? 'bg-brass text-ink' : 'text-muted hover:text-cream'
            }`}
          >
            {t === 'konta' ? 'Konta' : 'Programy motywacyjne'}
          </button>
        ))}
      </div>

      {tab === 'zawody' && (
        <div className="mt-5">
          <AdminZawody />
        </div>
      )}

      {tab === 'konta' && (
        <>
      <p className="mt-4 text-steel">
        Role, rangi i stawki zmieniają się serwerowo (RPC z gardą admina, audyt w events).
      </p>

      {error && (
        <p className="mt-6 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}
      {!users && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}

      {users && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3 font-medium">Osoba</th>
                <th className="px-4 py-3 font-medium">Rola</th>
                <th className="px-4 py-3 font-medium">Ranga</th>
                <th className="px-4 py-3 text-right font-medium">Stawka</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  editing={editId === u.id}
                  onEdit={() => setEditId(u.id)}
                  onClose={() => setEditId(null)}
                  onSaved={() => { setEditId(null); load() }}
                  onError={setError}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}
    </div>
  )
}

function UserRow({
  user,
  editing,
  onEdit,
  onClose,
  onSaved,
  onError,
}: {
  user: UserFull
  editing: boolean
  onEdit: () => void
  onClose: () => void
  onSaved: () => void
  onError: (m: string) => void
}) {
  const [role, setRole] = useState(user.role)
  const [rank, setRank] = useState(user.rank)
  const [pct, setPct] = useState(String(user.rankPct))
  const [saving, setSaving] = useState(false)

  useEffect(() => { setRole(user.role); setRank(user.rank); setPct(String(user.rankPct)) }, [user, editing])

  async function save() {
    setSaving(true)
    try {
      await adminUpdateUser(user.id, { role, rank: rank.trim(), rank_pct: Number(pct) || 0 })
      onSaved()
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const input = 'rounded-lg border border-line2 bg-bg px-2 py-1 text-sm text-cream outline-none focus:border-brass'

  if (editing)
    return (
      <tr className="bg-surface/60">
        <td className="px-4 py-3 font-medium text-cream">
          {user.firstName} {user.lastName}
          <div className="text-xs text-steel">{user.email}</div>
        </td>
        <td className="px-4 py-3">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={input}>
            {Object.keys(ROLE_LABEL).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <input value={rank} onChange={(e) => setRank(e.target.value)} className={`${input} w-28`} />
        </td>
        <td className="px-4 py-3 text-right">
          <input type="number" step="0.5" value={pct} onChange={(e) => setPct(e.target.value)} className={`${input} w-16 text-right`} />%
        </td>
        <td className="px-4 py-3 text-right">
          <button onClick={save} disabled={saving} className="rounded-lg bg-brass px-3 py-1 text-xs font-medium text-ink hover:bg-brass2 disabled:opacity-40">
            {saving ? '…' : 'Zapisz'}
          </button>
          <button onClick={onClose} className="ml-2 text-xs text-steel hover:text-cream">Anuluj</button>
        </td>
      </tr>
    )

  return (
    <tr className="hover:bg-surface">
      <td className="px-4 py-3 font-medium text-cream">
        {user.firstName} {user.lastName}
        <div className="text-xs text-steel">{user.email}</div>
      </td>
      <td className="px-4 py-3 text-muted">{ROLE_LABEL[user.role] ?? user.role}</td>
      <td className="px-4 py-3 text-muted">{user.rank}</td>
      <td className="px-4 py-3 text-right tabular-nums text-muted">{user.rankPct}%</td>
      <td className="px-4 py-3 text-right">
        <button onClick={onEdit} className="text-xs text-brass hover:underline">Edytuj</button>
      </td>
    </tr>
  )
}
