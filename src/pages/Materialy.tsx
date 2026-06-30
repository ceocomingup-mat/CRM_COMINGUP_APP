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
          <h1 className="text-2xl font-semibold text-slate-900">Materiały</h1>
          <p className="mt-1 text-slate-500">Baza materiałów: treści, linki i wideo.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            {adding ? 'Anuluj' : '+ Dodaj materiał'}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
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

      {!materials && !error && <p className="mt-6 text-slate-400">Wczytywanie…</p>}
      {materials && materials.length === 0 && (
        <p className="mt-6 text-slate-400">Brak materiałów.</p>
      )}

      <div className="mt-6 space-y-6">
        {[...byCat.entries()].map(([cat, items]) => (
          <div key={cat}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {cat}
            </div>
            <div className="space-y-3">
              {items.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {TYPE_LABEL[m.type] ?? m.type}
                      </span>
                      <h3 className="font-medium text-slate-900">{m.title}</h3>
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
                        className="shrink-0 text-xs text-red-500 hover:underline"
                      >
                        Usuń
                      </button>
                    )}
                  </div>
                  {m.description && (
                    <p className="mt-1 text-sm text-slate-500">{m.description}</p>
                  )}
                  {m.type === 'video' && m.url && (
                    <div className="mt-3 aspect-video overflow-hidden rounded-lg bg-slate-100">
                      <iframe src={m.url} title={m.title ?? 'video'} className="h-full w-full" allowFullScreen />
                    </div>
                  )}
                  {m.type === 'link' && m.url && (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-violet-600 hover:underline"
                    >
                      Otwórz: {m.url} ↗
                    </a>
                  )}
                  {m.type === 'html' && m.content && (
                    <div
                      className="prose prose-sm mt-3 max-w-none text-sm text-slate-700"
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

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200'

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Nowy materiał</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-500">Typ</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
            <option value="link">Link</option>
            <option value="video">Wideo (embed)</option>
            <option value="html">Treść (HTML)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-500">Kategoria</span>
          <input value={cat} onChange={(e) => setCat(e.target.value)} className={input} placeholder="np. Dokumenty" />
        </label>
      </div>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-500">Tytuł</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="Tytuł materiału" />
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-500">Opis (opcjonalnie)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={input} />
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-500">
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
        className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-40"
      >
        {saving ? 'Zapisywanie…' : 'Zapisz materiał'}
      </button>
    </div>
  )
}
