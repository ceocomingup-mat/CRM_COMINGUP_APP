import { useEffect, useState } from 'react'
import { useProfile } from '../components/Layout'
import {
  listMaterials,
  createMaterial,
  deleteMaterial,
  type Material,
} from '../lib/repo'

const TYPE_LABEL: Record<string, string> = { html: 'Treść', link: 'Link', video: 'Wideo' }

export default function Materialy() {
  const profile = useProfile()
  const isAdmin = profile.role === 'admin'
  const [materials, setMaterials] = useState<Material[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  function load() {
    listMaterials()
      .then(setMaterials)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }
  useEffect(load, [])

  // Grupowanie po kategorii.
  const byCat = new Map<string, Material[]>()
  for (const m of materials ?? []) {
    const c = m.cat || 'Bez kategorii'
    if (!byCat.has(c)) byCat.set(c, [])
    byCat.get(c)!.push(m)
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="kicker">Narzędzia</div>
          <h1 className="text-2xl font-semibold text-cream">Materiały</h1>
          <p className="mt-1 text-steel">Baza materiałów: treści, linki i wideo.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="shrink-0 rounded-lg bg-brass px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-brass2"
          >
            {adding ? 'Anuluj' : '+ Dodaj materiał'}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">
          Błąd: {error}
        </p>
      )}

      {isAdmin && adding && (
        <AddMaterialForm
          onAdded={() => {
            setAdding(false)
            load()
          }}
          onError={setError}
        />
      )}

      {!materials && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}
      {materials && materials.length === 0 && (
        <p className="mt-6 text-steel">Brak materiałów.</p>
      )}

      <div className="mt-6 space-y-6">
        {[...byCat.entries()].map(([cat, items]) => (
          <div key={cat}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel">
              {cat}
            </div>
            <div className="space-y-3">
              {items.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-line bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                        {TYPE_LABEL[m.type] ?? m.type}
                      </span>
                      <h3 className="font-medium text-cream">{m.title}</h3>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={async () => {
                          try {
                            await deleteMaterial(m.id)
                            load()
                          } catch (e: unknown) {
                            setError(e instanceof Error ? e.message : String(e))
                          }
                        }}
                        className="shrink-0 text-xs text-bad hover:underline"
                      >
                        Usuń
                      </button>
                    )}
                  </div>
                  {m.description && (
                    <p className="mt-1 text-sm text-steel">{m.description}</p>
                  )}
                  {m.type === 'video' && m.url && (
                    <div className="mt-3 aspect-video overflow-hidden rounded-lg bg-surface">
                      <iframe src={m.url} title={m.title ?? 'video'} className="h-full w-full" allowFullScreen />
                    </div>
                  )}
                  {m.type === 'link' && m.url && (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-brass hover:underline"
                    >
                      Otwórz: {m.url} ↗
                    </a>
                  )}
                  {m.type === 'html' && m.content && (
                    <div
                      className="prose prose-sm mt-3 max-w-none text-sm text-muted"
                      dangerouslySetInnerHTML={{ __html: m.content }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddMaterialForm({
  onAdded,
  onError,
}: {
  onAdded: () => void
  onError: (msg: string) => void
}) {
  const [type, setType] = useState('link')
  const [title, setTitle] = useState('')
  const [cat, setCat] = useState('')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('') // url (link/video) lub content (html)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!title.trim()) return onError('Podaj tytuł materiału.')
    setSaving(true)
    try {
      await createMaterial({
        type,
        title: title.trim(),
        cat: cat.trim() || null,
        description: description.trim() || null,
        content: type === 'html' ? body : null,
        url: type === 'link' || type === 'video' ? body.trim() || null : null,
      })
      onAdded()
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full rounded-lg border border-line2 px-3 py-2 text-sm outline-none focus:border-brass focus:ring-2 focus:ring-brass/30'

  return (
    <div className="mt-5 rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-cream">Nowy materiał</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-steel">Typ</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
            <option value="link">Link</option>
            <option value="video">Wideo (embed)</option>
            <option value="html">Treść (HTML)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-steel">Kategoria</span>
          <input value={cat} onChange={(e) => setCat(e.target.value)} className={input} placeholder="np. Dokumenty" />
        </label>
      </div>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-xs font-medium text-steel">Tytuł</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="Tytuł materiału" />
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-xs font-medium text-steel">Opis (opcjonalnie)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={input} />
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-xs font-medium text-steel">
          {type === 'html' ? 'Treść HTML' : 'URL'}
        </span>
        {type === 'html' ? (
          <textarea value={body} onChange={(e) => setBody(e.target.value)} className={`${input} h-24`} />
        ) : (
          <input value={body} onChange={(e) => setBody(e.target.value)} className={input} placeholder="https://…" />
        )}
      </label>
      <button
        onClick={submit}
        disabled={saving}
        className="mt-4 rounded-lg bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-brass2 disabled:opacity-40"
      >
        {saving ? 'Zapisywanie…' : 'Zapisz materiał'}
      </button>
    </div>
  )
}
