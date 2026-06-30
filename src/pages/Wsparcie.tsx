import { useEffect, useMemo, useState } from 'react'
import { listQaItems, type QaItem } from '../lib/repo'

// Statyczny katalog partnerów / przydatnych zasobów (B11 — wariant „statyczny").
const PARTNERS = [
  {
    name: 'Instytut Ciepły Dom (ICD)',
    desc: 'Centrala — weryfikacja dokumentów, akceptacja umów, wnioski o dofinansowanie.',
    url: null as string | null,
  },
  {
    name: 'Portal Czyste Powietrze (gov.pl)',
    desc: 'Oficjalny portal programu — zasady, progi dochodowe, statusy wniosków.',
    url: 'https://czystepowietrze.gov.pl',
  },
  {
    name: 'Lista ZUM',
    desc: 'Lista urządzeń i materiałów kwalifikujących się do dofinansowania.',
    url: 'https://lista-zum.ios.edu.pl',
  },
]

export default function Wsparcie() {
  const [qa, setQa] = useState<QaItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    listQaItems()
      .then(setQa)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const results = useMemo(() => {
    if (!qa) return []
    const q = query.trim().toLowerCase()
    if (!q) return qa
    return qa.filter((it) =>
      [it.q, it.a, it.tip, it.cat].some((f) => (f ?? '').toLowerCase().includes(q)),
    )
  }, [qa, query])

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Wsparcie</h1>
      <p className="mt-1 text-slate-500">Szukaj odpowiedzi i przydatnych kontaktów.</p>

      {/* ── Wyszukiwarka pomocy ── */}
      <div className="mt-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj w bazie pomocy (np. dochód, audyt, ICD)…"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Błąd: {error}</p>
      )}
      {!qa && !error && <p className="mt-6 text-slate-400">Wczytywanie…</p>}

      {qa && (
        <>
          <div className="mt-4 text-xs text-slate-400">
            {query ? `${results.length} wyników dla „${query}”` : `${qa.length} pytań w bazie`}
          </div>
          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {results.length === 0 && (
              <p className="px-4 py-4 text-sm text-slate-400">Brak wyników. Spróbuj innej frazy.</p>
            )}
            {results.map((it) => {
              const isOpen = open === it.id
              return (
                <div key={it.id} className="border-b border-slate-100 last:border-b-0">
                  <button
                    onClick={() => setOpen(isOpen ? null : it.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    <span>
                      {it.cat && (
                        <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                          {it.cat}
                        </span>
                      )}
                      {it.q}
                    </span>
                    <span className="shrink-0 text-slate-400">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-sm text-slate-600">
                      {it.a && (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: it.a }}
                        />
                      )}
                      {it.tip && (
                        <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          💡 {it.tip}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Przydatne kontakty / partnerzy ── */}
      <h2 className="mt-10 mb-3 text-lg font-semibold text-slate-900">Przydatne kontakty</h2>
      <div className="space-y-3">
        {PARTNERS.map((p) => (
          <div key={p.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-medium text-slate-900">{p.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
            {p.url && (
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-violet-600 hover:underline"
              >
                {p.url} ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
