import { useEffect, useState } from 'react'
import { listNews, listUsers, type News } from '../lib/repo'

const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-bad/15 text-bad',
  medium: 'bg-warn/15 text-warn',
  normal: 'bg-surface text-muted',
}

function fmtDate(v: string): string {
  const d = new Date(v)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Aktualnosci() {
  const [news, setNews] = useState<News[] | null>(null)
  const [authors, setAuthors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listNews(), listUsers()])
      .then(([ns, us]) => {
        const map: Record<string, string> = {}
        for (const u of us) map[u.id] = `${u.firstName} ${u.lastName}`.trim()
        setAuthors(map)
        setNews(
          [...ns].sort(
            (a, b) =>
              Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt),
          ),
        )
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <div className="max-w-3xl">
      <div className="kicker">Narzędzia</div>
      <h1 className="text-2xl font-semibold text-cream">Aktualności</h1>
      <p className="mt-1 text-steel">Ogłoszenia i komunikaty dla zespołu.</p>

      {error && (
        <p className="mt-6 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}
      {!news && !error && <p className="mt-6 text-steel">Wczytywanie…</p>}
      {news && news.length === 0 && (
        <p className="mt-6 rounded-2xl border border-line bg-card px-5 py-4 text-steel">
          Brak aktualności.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {news?.map((n) => (
          <article
            key={n.id}
            className={`rounded-2xl border bg-card p-5 shadow-sm ${
              n.pinned ? 'border-brass/40' : 'border-line'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-cream">
                {n.pinned && <span className="mr-2 text-brass">📌</span>}
                {n.title}
              </h2>
              {n.priority && PRIORITY_STYLE[n.priority] && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[n.priority]}`}>
                  {n.priority === 'high' ? 'Ważne' : n.priority === 'medium' ? 'Istotne' : 'Info'}
                </span>
              )}
            </div>
            {n.content && (
              <div
                className="prose-sm mt-2 text-sm leading-relaxed text-muted [&_a]:text-brass [&_strong]:text-cream"
                dangerouslySetInnerHTML={{ __html: n.content }}
              />
            )}
            <div className="mt-3 text-xs text-steel">
              {n.authorId && authors[n.authorId] && <span>{authors[n.authorId]} · </span>}
              {fmtDate(n.createdAt)}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
