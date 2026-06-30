import { Component, type ReactNode } from 'react'

/* Łapie błędy renderowania w poddrzewie, żeby pojedynczy wyjątek na jednej
 * stronie nie wywalał całej aplikacji do białego ekranu. Pokazuje przyjazny
 * komunikat z możliwością powrotu/odświeżenia. Błąd loguje do konsoli. */
interface Props {
  children: ReactNode
  /* Klucz zmieniający się przy nawigacji — reset stanu błędu po wejściu na inną trasę. */
  resetKey?: string
}
interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(prev: Props) {
    // Po zmianie trasy wyczyść błąd, by nowa strona miała szansę się wyrenderować.
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-card p-6 text-center shadow-sm">
          <div className="text-3xl">⚠️</div>
          <h2 className="mt-3 font-display text-lg font-semibold text-cream">Coś poszło nie tak</h2>
          <p className="mt-2 text-sm text-steel">
            Ten widok napotkał nieoczekiwany błąd. Możesz odświeżyć stronę lub wrócić do pulpitu.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-brass2"
            >
              Odśwież
            </button>
            <a
              href="/"
              className="rounded-lg border border-line2 px-4 py-2 text-sm text-muted transition hover:bg-surface"
            >
              Pulpit
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
