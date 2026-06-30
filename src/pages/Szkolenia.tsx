import { useEffect, useState } from 'react'
import { useProfile } from '../components/Layout'
import {
  listMaterials,
  listQaItems,
  listTestsMeta,
  listMyTestAttempts,
  getTestPublic,
  submitTest,
  type Material,
  type QaItem,
  type TestMeta,
  type TestAttempt,
  type TestFull,
  type TestResult,
} from '../lib/repo'

export default function Szkolenia() {
  const profile = useProfile()
  const [materials, setMaterials] = useState<Material[] | null>(null)
  const [qa, setQa] = useState<QaItem[] | null>(null)
  const [tests, setTests] = useState<TestMeta[] | null>(null)
  const [attempts, setAttempts] = useState<TestAttempt[]>([])
  const [error, setError] = useState<string | null>(null)
  const [openQa, setOpenQa] = useState<string | null>(null)

  // Quiz (B9 cz.2 — ocena serwerowa)
  const [quiz, setQuiz] = useState<TestFull | null>(null)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [quizError, setQuizError] = useState<string | null>(null)

  function refreshAttempts() {
    listMyTestAttempts(profile.id).then(setAttempts).catch(() => {})
  }

  useEffect(() => {
    Promise.all([listMaterials(), listQaItems(), listTestsMeta(), listMyTestAttempts(profile.id)])
      .then(([m, q, t, a]) => {
        setMaterials(m)
        setQa(q)
        setTests(t)
        setAttempts(a)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [profile.id])

  async function startQuiz(id: string) {
    setQuizError(null)
    setResult(null)
    setAnswers({})
    try {
      setQuiz(await getTestPublic(id))
    } catch (e: unknown) {
      setQuizError(e instanceof Error ? e.message : String(e))
    }
  }

  function toggleAnswer(qid: string, optId: string, multi: boolean) {
    setAnswers((prev) => {
      const cur = prev[qid] ?? []
      if (multi) {
        return { ...prev, [qid]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] }
      }
      return { ...prev, [qid]: [optId] }
    })
  }

  async function submitQuiz() {
    if (!quiz) return
    setSubmitting(true)
    setQuizError(null)
    try {
      const res = await submitTest(quiz.id, answers)
      setResult(res)
      refreshAttempts()
    } catch (e: unknown) {
      setQuizError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  // Najlepszy wynik użytkownika per test.
  const bestByTest = new Map<string, TestAttempt>()
  for (const a of attempts) {
    const cur = bestByTest.get(a.testId)
    if (!cur || (a.score ?? 0) > (cur.score ?? 0)) bestByTest.set(a.testId, a)
  }

  // Q&A pogrupowane po kategorii.
  const qaByCat = new Map<string, QaItem[]>()
  for (const item of qa ?? []) {
    const c = item.cat || 'Inne'
    if (!qaByCat.has(c)) qaByCat.set(c, [])
    qaByCat.get(c)!.push(item)
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Szkolenia i baza wiedzy</h1>
      <p className="mt-1 text-slate-500">Materiały, baza wiedzy i testy kwalifikacyjne.</p>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Błąd wczytywania: {error}
        </p>
      )}

      {/* ── Testy wiedzy ── */}
      <h2 className="mt-8 mb-3 text-lg font-semibold text-slate-900">Testy wiedzy</h2>
      {!tests && !error && <p className="text-slate-400">Wczytywanie…</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tests?.map((t) => {
          const best = bestByTest.get(t.id)
          return (
            <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-slate-900">{t.title}</h3>
                {t.required && (
                  <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                    wymagany
                  </span>
                )}
              </div>
              {t.description && <p className="mt-1 text-sm text-slate-500">{t.description}</p>}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-400">próg zaliczenia: {t.passingScore ?? '—'}%</span>
                {best ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      best.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {best.passed ? '✓ zaliczony' : 'do poprawy'} · {best.score ?? 0}%
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    nierozpoczęty
                  </span>
                )}
              </div>
              <button
                onClick={() => startQuiz(t.id)}
                className="mt-3 w-full rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700"
              >
                {best ? 'Rozwiąż ponownie' : 'Rozwiąż test'}
              </button>
            </div>
          )
        })}
      </div>

      {quiz && (
        <Quiz
          quiz={quiz}
          answers={answers}
          submitting={submitting}
          result={result}
          error={quizError}
          onToggle={toggleAnswer}
          onSubmit={submitQuiz}
          onClose={() => setQuiz(null)}
        />
      )}

      {/* ── Materiały ── */}
      <h2 className="mt-10 mb-3 text-lg font-semibold text-slate-900">Materiały</h2>
      <div className="space-y-3">
        {materials?.map((m) => (
          <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {m.cat || m.type}
              </span>
              <h3 className="font-medium text-slate-900">{m.title}</h3>
            </div>
            {m.description && <p className="mt-1 text-sm text-slate-500">{m.description}</p>}
            {m.type === 'video' && m.url && (
              <div className="mt-3 aspect-video overflow-hidden rounded-lg bg-slate-100">
                <iframe
                  src={m.url}
                  title={m.title ?? 'video'}
                  className="h-full w-full"
                  allowFullScreen
                />
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

      {/* ── Baza wiedzy ── */}
      <h2 className="mt-10 mb-3 text-lg font-semibold text-slate-900">Baza wiedzy</h2>
      <div className="space-y-6">
        {[...qaByCat.entries()].map(([cat, items]) => (
          <div key={cat}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {cat}
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {items.map((item) => {
                const open = openQa === item.id
                return (
                  <div key={item.id} className="border-b border-slate-100 last:border-b-0">
                    <button
                      onClick={() => setOpenQa(open ? null : item.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      <span>{item.q}</span>
                      <span className="shrink-0 text-slate-400">{open ? '−' : '+'}</span>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 text-sm text-slate-600">
                        {item.a && (
                          <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: item.a }}
                          />
                        )}
                        {item.tip && (
                          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            💡 {item.tip}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Quiz({
  quiz,
  answers,
  submitting,
  result,
  error,
  onToggle,
  onSubmit,
  onClose,
}: {
  quiz: TestFull
  answers: Record<string, string[]>
  submitting: boolean
  result: TestResult | null
  error: string | null
  onToggle: (qid: string, optId: string, multi: boolean) => void
  onSubmit: () => void
  onClose: () => void
}) {
  const allAnswered = quiz.questions.every((q) => (answers[q.id]?.length ?? 0) > 0)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{quiz.title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        {result ? (
          <div className="mt-4">
            <div
              className={`rounded-2xl p-5 text-center ${
                result.passed ? 'bg-emerald-50' : 'bg-amber-50'
              }`}
            >
              <div
                className={`text-3xl font-bold ${
                  result.passed ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {result.score}%
              </div>
              <div className={`mt-1 text-sm ${result.passed ? 'text-emerald-700' : 'text-amber-700'}`}>
                {result.passed ? '✓ Test zaliczony' : 'Test niezaliczony — spróbuj ponownie'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Poprawne odpowiedzi: {result.correct} / {result.total} · próg {quiz.passingScore ?? '—'}%
              </div>
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
            >
              Zamknij
            </button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Zaznacz odpowiedzi. Ocena następuje po stronie serwera.
            </p>
            <div className="mt-4 space-y-5">
              {quiz.questions.map((q, i) => {
                const multi = q.type === 'multi'
                const sel = answers[q.id] ?? []
                return (
                  <div key={q.id}>
                    <div className="text-sm font-medium text-slate-800">
                      {i + 1}. {q.text}
                      {multi && <span className="ml-2 text-xs text-slate-400">(wielokrotny wybór)</span>}
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {q.options.map((o) => {
                        const checked = sel.includes(o.id)
                        return (
                          <label
                            key={o.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                              checked
                                ? 'border-violet-300 bg-violet-50 text-violet-800'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type={multi ? 'checkbox' : 'radio'}
                              name={q.id}
                              checked={checked}
                              onChange={() => onToggle(q.id, o.id, multi)}
                            />
                            {o.text}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              onClick={onSubmit}
              disabled={submitting || !allAnswered}
              className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-40"
            >
              {submitting ? 'Sprawdzanie…' : allAnswered ? 'Sprawdź wynik' : 'Odpowiedz na wszystkie pytania'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
