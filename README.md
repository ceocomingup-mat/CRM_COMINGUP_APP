# CRM ComingUP — front

CRM dla struktury sprzedaży (program Czyste Powietrze) na żywej bazie **Supabase**
(RLS, realtime). Logowanie ról, proces 11 etapów klienta, leady, cele, raporty,
szkolenia z testami i baza wiedzy.

**Live:** https://app-pi-two-71.vercel.app
Konta demo (hasło `demo123`): `admin@` · `marek@` · `maria@comingup.pl`

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
- `npm run e2e` — testy E2E (Playwright, read-only)
- `npm run lint` — oxlint

## Konfiguracja
Klucz Supabase (publishable) jest w `src/lib/supabase.ts` — bezpieczny w przeglądarce,
bo dostęp do danych pilnuje RLS. Zmienne środowiskowe (np. `VITE_MAPBOX_TOKEN` dla mapy)
idą do `app/.env.local` (gitignored) — **tylko tokeny publiczne**; sekrety nigdy do frontu.

## Wdrożenie
Hosting: **Vercel** (Root Directory = `app`, SPA-rewrite w `vercel.json`).
Ręcznie: `npx vercel --prod --yes`. Po połączeniu repo z Vercelem — push do `main` = auto-deploy.

## Struktura
`src/pages/` — widoki (Pulpit, Klienci, KlientKarta, Leady, LeadKarta, Aktywność,
Szkolenia, Materiały, Wsparcie, Zespół, Raporty) · `src/lib/` — Supabase + warstwa danych
(`repo.ts`) · `src/components/` — Layout, GoalGate · `e2e/` — testy Playwright.
