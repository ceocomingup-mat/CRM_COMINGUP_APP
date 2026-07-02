/* ============================================================================
 *  AdminZawody.tsx — panel admina: programy motywacyjne (contests)
 * ----------------------------------------------------------------------------
 *  Tworzenie/edycja programu z opisem, grafiką i plikiem (np. regulamin PDF)
 *  — upload do Storage `contest-assets` (ZAWODY3), zapis przez RLS
 *  contests_write (admin). Zamknięcie liczy zwycięzcę tak samo jak widok
 *  Zawody (standingsFor z lib/zawody).
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useProfile } from './Layout'
import {
  listContests,
  listCommissions,
  listUsers,
  createContest,
  updateContest,
  closeContest,
  deleteContest,
  uploadContestAsset,
  type Contest,
  type ContestInput,
  type CommissionRow,
  type UserLite,
} from '../lib/repo'
import { standingsFor, metricLabel, fmtValue, fmtDate, localDay } from '../lib/zawody'

const MAX_FILE_MB = 20

const input =
  'w-full rounded-lg border border-line2 bg-bg px-2.5 py-1.5 text-sm text-cream outline-none focus:border-brass'
const label = 'mt-3 block text-xs font-medium uppercase tracking-wide text-steel'

export default function AdminZawody() {
  const profile = useProfile()
  const [contests, setContests] = useState<Contest[] | null>(null)
  const [comms, setComms] = useState<CommissionRow[]>([])
  const [users, setUsers] = useState<UserLite[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Contest | 'new' | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function load() {
    Promise.all([listContests(), listCommissions(), listUsers()])
      .then(([cs, cm, us]) => { setContests(cs); setComms(cm); setUsers(us) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }
  useEffect(load, [])

  const nameOf = useMemo(() => {
    const m = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]))
    return (id: string) => m.get(id) ?? '—'
  }, [users])

  async function onClose(c: Contest) {
    const st = standingsFor(c, comms)
    const top = st[0] ?? null
    const summary = top
      ? `Zwycięzca: ${nameOf(top.uid)} — ${fmtValue(c, top.value)}.`
      : 'Brak wyników w okresie — program zamknie się bez zwycięzcy.'
    if (!window.confirm(`Zakończyć program „${c.title}"?\n${summary}`)) return
    setBusyId(c.id)
    try {
      await closeContest(c.id, {
        winnerId: top?.uid ?? null,
        winnerValue: top?.value ?? null,
      })
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  async function onDelete(c: Contest) {
    if (!window.confirm(`Usunąć program „${c.title}"? Tej operacji nie można cofnąć.`)) return
    setBusyId(c.id)
    try {
      await deleteContest(c.id)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  const active = (contests ?? []).filter((c) => c.status === 'active')
  const closed = (contests ?? []).filter((c) => c.status === 'closed')

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-steel">
          Programy motywacyjne: tytuł, warunki, opis, grafika i plik (np. regulamin) — doradcy
          widzą wszystko w zakładce Programy motywacyjne.
        </p>
        <button
          onClick={() => setEditing(editing === 'new' ? null : 'new')}
          className="shrink-0 rounded-lg bg-brass px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-brass2"
        >
          {editing === 'new' ? 'Anuluj' : '+ Nowy program'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}
      {!contests && !error && <p className="mt-4 text-steel">Wczytywanie…</p>}

      {editing === 'new' && (
        <ContestForm
          key="new"
          contest={null}
          createdBy={profile.id}
          onDone={() => { setEditing(null); load() }}
          onCancel={() => setEditing(null)}
        />
      )}

      {contests && contests.length === 0 && editing !== 'new' && (
        <p className="mt-4 rounded-lg bg-cardhi/60 px-3 py-2 text-sm text-muted">
          Brak programów. Ogłoś pierwszy przyciskiem „+ Nowy program".
        </p>
      )}

      {[...active, ...closed].map((c) =>
        editing !== 'new' && editing?.id === c.id ? (
          <ContestForm
            key={c.id}
            contest={c}
            createdBy={profile.id}
            onDone={() => { setEditing(null); load() }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <section key={c.id} className="mt-4 rounded-2xl border border-line bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start gap-3">
              {c.imageUrl && (
                <img
                  src={c.imageUrl}
                  alt=""
                  className="h-14 w-14 rounded-lg border border-line object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === 'active' ? 'bg-go/15 text-go' : 'bg-surface text-muted'
                    }`}
                  >
                    {c.status === 'active' ? 'Trwa' : 'Zakończony'}
                  </span>
                  <span className="font-display font-semibold text-cream">{c.title}</span>
                </div>
                <div className="mt-0.5 text-xs text-steel">
                  {metricLabel(c)} · {fmtDate(c.startTs)}–{fmtDate(c.endTs)}
                  {c.status === 'closed' && c.winnerId && (
                    <> · 🏆 {nameOf(c.winnerId)} — {fmtValue(c, c.winnerValue ?? 0)}</>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
                  {c.description && <span className="rounded-full bg-surface px-2 py-0.5">Opis ✓</span>}
                  {c.attachmentUrl && (
                    <a
                      href={c.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-surface px-2 py-0.5 text-brass hover:underline"
                    >
                      📎 {c.attachmentName || 'plik'}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs">
                <button onClick={() => setEditing(c)} className="text-brass hover:underline">
                  Edytuj
                </button>
                {c.status === 'active' && (
                  <button
                    onClick={() => onClose(c)}
                    disabled={busyId === c.id}
                    className="text-warn hover:underline disabled:opacity-40"
                  >
                    Zakończ
                  </button>
                )}
                <button
                  onClick={() => onDelete(c)}
                  disabled={busyId === c.id}
                  className="text-bad hover:underline disabled:opacity-40"
                >
                  Usuń
                </button>
              </div>
            </div>
          </section>
        ),
      )}
    </div>
  )
}

/* ── Formularz tworzenia/edycji programu ─────────────────────────────────── */
function ContestForm({
  contest,
  createdBy,
  onDone,
  onCancel,
}: {
  contest: Contest | null
  createdBy: string
  onDone: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(contest?.title ?? '')
  const [metric, setMetric] = useState(contest?.metric ?? 'umowy')
  const [startDate, setStartDate] = useState(localDay(contest?.startTs ?? null) ?? '')
  const [endDate, setEndDate] = useState(localDay(contest?.endTs ?? null) ?? '')
  const [rewardBadge, setRewardBadge] = useState(contest?.rewardBadge ?? '')
  const [rewardCash, setRewardCash] = useState(contest?.rewardCash ? String(contest.rewardCash) : '')
  const [rewardText, setRewardText] = useState(contest?.rewardText ?? '')
  const [description, setDescription] = useState(contest?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function pickFile(ref: React.RefObject<HTMLInputElement | null>): File | null {
    const f = ref.current?.files?.[0] ?? null
    if (f && f.size > MAX_FILE_MB * 1024 * 1024)
      throw new Error(`Plik „${f.name}" przekracza limit ${MAX_FILE_MB} MB.`)
    return f
  }

  async function save() {
    setError(null)
    if (!title.trim()) { setError('Podaj tytuł programu.'); return }
    if (!startDate || !endDate) { setError('Podaj daty rozpoczęcia i zakończenia.'); return }
    if (endDate < startDate) { setError('Data zakończenia jest przed rozpoczęciem.'); return }
    setSaving(true)
    try {
      const img = pickFile(imageRef)
      const att = pickFile(fileRef)
      const imageUrl = img ? await uploadContestAsset(img, 'image') : (contest?.imageUrl ?? null)
      const attachmentUrl = att
        ? await uploadContestAsset(att, 'attachment')
        : (contest?.attachmentUrl ?? null)
      const attachmentName = att ? att.name : (contest?.attachmentName ?? null)

      const payload: ContestInput = {
        title: title.trim(),
        metric,
        period: contest?.period ?? null,
        startTs: new Date(`${startDate}T00:00:00`).toISOString(),
        endTs: new Date(`${endDate}T23:59:59.999`).toISOString(),
        rewardBadge: rewardBadge.trim() || null,
        rewardCash: rewardCash ? Number(rewardCash) : null,
        rewardText: rewardText.trim() || null,
        description: description.trim() || null,
        imageUrl,
        attachmentUrl,
        attachmentName,
      }
      if (contest) await updateContest(contest.id, payload)
      else await createContest(payload, createdBy)
      onDone()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-brass/40 bg-card p-5 shadow-sm">
      <h3 className="font-display font-semibold text-cream">
        {contest ? `Edycja: ${contest.title}` : 'Nowy program motywacyjny'}
      </h3>

      {error && (
        <p className="mt-3 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}

      <label className={label}>Tytuł *</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className={input}
        placeholder="np. Letni sprint — lipiec 2026" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={label}>Metryka</label>
          <select value={metric} onChange={(e) => setMetric(e.target.value)} className={input}>
            <option value="umowy">Liczba umów</option>
            <option value="mm">Masa Marży</option>
          </select>
        </div>
        <div>
          <label className={label}>Od *</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Do *</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={input} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={label}>Odznaka</label>
          <input value={rewardBadge} onChange={(e) => setRewardBadge(e.target.value)} className={input}
            placeholder="np. Mistrz Lipca" />
        </div>
        <div>
          <label className={label}>Premia (zł)</label>
          <input type="number" min="0" value={rewardCash} onChange={(e) => setRewardCash(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Nagroda (tekst)</label>
          <input value={rewardText} onChange={(e) => setRewardText(e.target.value)} className={input}
            placeholder="np. weekend w SPA" />
        </div>
      </div>

      <label className={label}>Opis programu</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        className={input}
        placeholder="Zasady, dla kogo, co trzeba zrobić…"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Grafika programu</label>
          {contest?.imageUrl && (
            <img src={contest.imageUrl} alt="" className="mb-2 h-16 rounded-lg border border-line object-cover" />
          )}
          <input ref={imageRef} type="file" accept="image/*" className="block w-full text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:text-cream" />
        </div>
        <div>
          <label className={label}>Plik (np. regulamin PDF)</label>
          {contest?.attachmentUrl && (
            <div className="mb-2 text-xs text-muted">📎 {contest.attachmentName || 'plik'} (obecny)</div>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="block w-full text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:text-cream" />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brass px-4 py-1.5 text-sm font-medium text-ink transition hover:bg-brass2 disabled:opacity-40"
        >
          {saving ? 'Zapisywanie…' : contest ? 'Zapisz zmiany' : 'Ogłoś program'}
        </button>
        <button onClick={onCancel} className="text-sm text-steel hover:text-cream">Anuluj</button>
      </div>
    </section>
  )
}
