# CRM ComingUP — front

CRM dla struktury sprzedaży (program Czyste Powietrze) na żywej bazie **Supabase**
(RLS, realtime). Logowanie ról, proces 11 etapów klienta, leady, cele, raporty,
szkolenia z testami i baza wiedzy.

**Live:** https://app-pi-two-71.vercel.app

Logowanie e-mailem + reset hasła przez e-mail. Konta zakłada administrator
(panel **Administracja**); publiczna rejestracja jest wyłączona.

## Stack
React 19 · Vite · TypeScript · Tailwind v4 · react-router v7 · @supabase/supabase-js.

## Uruchomienie lokalnie
```bash
npm install
npm run dev        # http://localhost:5173
```

## Skrypty
- `npm run dev` — serwer deweloperski
- `npm run build` — build produkcyjny (`tsc -b && vite build`)
- `npm run e2e` — testy E2E (Playwright, read-only). Po zmianie haseł kont demo
  podaj hasło testowe: `E2E_PASS='...' npm run e2e`
- `npm run lint` — oxlint

## Konfiguracja
Klucz Supabase (publishable) jest w `src/lib/supabase.ts` — bezpieczny w przeglądarce,
bo dostęp do danych pilnuje RLS. Zmienne środowiskowe (np. `VITE_MAPBOX_TOKEN` dla mapy)
idą do `app/.env.local` (gitignored) — **tylko tokeny publiczne**; sekrety nigdy do frontu.

## Wdrożenie
Hosting: **Vercel** (Root Directory = `app`, SPA-rewrite + nagłówki bezpieczeństwa/CSP
w `vercel.json`). Ręcznie: `npx vercel --prod --yes`. Repo połączone z Vercelem —
push do `main` = auto-deploy.

## Struktura
- `src/pages/` — widoki: Pulpit, Klienci + KlientKarta (proces 11 etapów), Leady +
  LeadKarta, Zadania, Umowy/Prowizje, Kalkulator prowizji, Mapa (dystanse + planer trasy),
  Aktualności, Ranking, Statystyki, Kalendarz, Profil, Ustawienia, Administracja, Zawody,
  Aktywność, Szkolenia + testy, Materiały, Wsparcie, Zespół, Raporty, Login, ResetPassword.
- `src/lib/` — `supabase.ts` (klient + auth + reset hasła), `repo.ts` (warstwa danych nad
  RLS; geokodowanie i macierz tras Mapbox), `pace.ts` (wskaźniki tempa).
- `src/components/` — Layout (nawigacja + Suspense), GoalGate (bramka celów), ErrorBoundary.
- `e2e/` — testy Playwright (smoke + nowe widoki).

## Bezpieczeństwo
RLS na wszystkich tabelach (dostęp per rola). Pola wrażliwe profilu (rola/ranga/%/struktura)
i operacje serwerowe (prowizje, etapy) idą przez RPC z gardą. Front zawiera tylko tokeny
publiczne. Nagłówki HTTP + CSP w `vercel.json`. Zmiany ról/rang — panel Administracja (RPC).
