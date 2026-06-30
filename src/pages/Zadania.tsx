import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../components/Layout'
import {
  listTasks,
  listClients,
  setTaskStatus,
  createTask,
  type Task,
  type Client,
} from '../lib/repo'

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Wysoki', medium: 'Średni', normal: 'Normalny', low: 'Niski',
}
const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-bad/15 text-bad', medium: 'bg-warn/15 text-warn',
  normal: 'bg-surface text-muted', low: 'bg-surface text-steel',
}

function startOfToday(): number {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime()
}
function dueInfo(due: string | null): { label: string; cls: string } {
  if (!due) return { label: 'bez terminu', cls: 'text-steel' }
  const d = new Date(due)
  if (isNaN(d.getTime())) return { label: '', cls: 'text-steel' }
  const day = new Date(d); day.setHours(0, 0, 0, 0)
  const diff = day.getTime() - startOfToday()
  const fmt = d.toLocaleDateString('pl-PL')
  if (diff < 0) return { label: `zaległe · ${fmt}`, cls: 'text-bad' }
  if (diff === 0) return { label: 'dziś', cls: 'text-warn' }
  return { label: fmt, cls: 'text-steel' }
}

export default function Zadania() {
  const profile = useProfile()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  function load() {
    Promise.all([listTasks(), listClients()])
      .then(([ts, cs]) => {
        setClients(cs)
        setTasks(ts.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')))
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }
  useEffect(load, [])

  const clientName: Record<string, string> = {}
  for (const c of clients) clientName[c.id] = `${c.firstName} ${c.lastName}`.trim()

  const pending = tasks?.filter((t) => t.status === 'pending') ?? []
  const done = tasks?.filter((t) => t.status === 'done') ?? []

  async function complete(id: string) {
    setBusy(id)
    try {
      await setTaskStatus(id, 'done')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }
  async function reopen(id: string) {
    setBusy(id)
    try {
      await setTaskStatus(id, 'pending')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="kicker">Główne</div>
          <h1 className="text-2xl font-semibold text-cream">Zadania</h1>
          <p className="mt-1 text-steel">Twoja lista „do zrobienia" — odhaczaj i dodawaj.</p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="shrink-0 rounded-lg bg-brass px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-brass2"
        >
          {adding ? 'Anuluj' : '+ Dodaj zadanie'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}

      {adding && (
        <AddTaskForm
          clients={clients}
          userId={profile.id}
          onAdded={() => { setAdding(false); load() }}
          onError={setError}
        />
      )}

      {!tasks && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}

      {/* Do zrobienia */}
      <h2 className="mt-8 mb-3 text-lg font-semibold text-cream">
        Do zrobienia {pending.length > 0 && <span className="text-steel">· {pending.length}</span>}
      </h2>
      {tasks && pending.length === 0 && (
        <p className="rounded-2xl border border-line bg-card px-5 py-4 text-steel">
          Brak zadań do zrobienia. 🎉
        </p>
      )}
      <ul className="space-y-2">
        {pending.map((t) => {
          const di = dueInfo(t.dueDate)
          return (
            <li key={t.id} className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm">
              <button
                onClick={() => complete(t.id)}
                disabled={busy === t.id}
                title="Oznacz jako zrobione"
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-line2 text-transparent transition hover:border-go hover:text-go disabled:opacity-40"
              >
                ✓
              </button>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-cream">{t.title}</div>
                {t.notes && <div className="mt-0.5 text-sm text-muted">{t.notes}</div>}
                {t.clientId && clientName[t.clientId] && (
                  <Link to={`/klienci/${t.clientId}`} className="mt-1 inline-block text-sm text-brass hover:underline">
                    Klient: {clientName[t.clientId]}
                  </Link>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`badge rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[t.priority] ?? 'bg-surface text-muted'}`}>
                  {PRIORITY_LABEL[t.priority] ?? t.priority}
                </span>
                <span className={`text-xs font-medium ${di.cls}`}>{di.label}</span>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Zrobione */}
      {done.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-lg font-semibold text-cream">
            Zrobione <span className="text-steel">· {done.length}</span>
          </h2>
          <ul className="space-y-1.5">
            {done.slice(0, 20).map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl border border-line bg-card/50 px-4 py-2.5">
                <button
                  onClick={() => reopen(t.id)}
                  disabled={busy === t.id}
                  title="Cofnij do zrobienia"
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-go/20 text-go disabled:opacity-40"
                >
                  ✓
                </button>
                <span className="flex-1 truncate text-sm text-steel line-through">{t.title}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function AddTaskForm({
  clients,
  userId,
  onAdded,
  onError,
}: {
  clients: Client[]
  userId: string
  onAdded: () => void
  onError: (m: string) => void
}) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState('normal')
  const [clientId, setClientId] = useState('')
  const [saving, setSaving] = useState(false)

  const input =
    'w-full rounded-lg border border-line2 bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-brass focus:ring-2 focus:ring-brass/30'

  async function submit() {
    if (!title.trim()) return onError('Podaj treść zadania.')
    setSaving(true)
    try {
      await createTask({
        assignedTo: userId,
        title: title.trim(),
        notes: notes.trim() || null,
        dueDate: due || null,
        priority,
        clientId: clientId || null,
      })
      onAdded()
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-cream">Nowe zadanie</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Co trzeba zrobić?" className={input} />
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notatka (opcjonalnie)" className={`${input} mt-3`} />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs text-steel">Termin</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-steel">Priorytet</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={input}>
            <option value="high">Wysoki</option>
            <option value="medium">Średni</option>
            <option value="normal">Normalny</option>
            <option value="low">Niski</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-steel">Klient (opcjonalnie)</span>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={input}>
            <option value="">—</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
        </label>
      </div>
      <button
        onClick={submit}
        disabled={saving}
        className="mt-4 rounded-lg bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-brass2 disabled:opacity-40"
      >
        {saving ? 'Zapisywanie…' : 'Dodaj zadanie'}
      </button>
    </div>
  )
}
