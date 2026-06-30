import { test, expect, type Page } from '@playwright/test'

// Hasło kont testowych z env (E2E_PASS) — hasła demo zrotowane na produkcji.
// Logika RLS/ról weryfikowana na żywej bazie. Uruchom: E2E_PASS='...' npm run e2e
const PASS = process.env.E2E_PASS || 'demo123'

async function login(page: Page, email: string) {
  await page.goto('/')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(PASS)
  await page.getByRole('button', { name: 'Zaloguj się' }).click()
  // sidebar pojawia się po zalogowaniu
  await expect(page.getByText('ComingUP CRM')).toBeVisible()
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Wyloguj' }).click()
  await expect(page.locator('input[type="email"]')).toBeVisible()
}

test('logowanie: złe hasło odrzucone', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="email"]').fill('maria@comingup.pl')
  await page.locator('input[type="password"]').fill('zle-haslo')
  await page.getByRole('button', { name: 'Zaloguj się' }).click()
  // nadal na ekranie logowania (brak sidebara z nawigacją)
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pulpit' })).toHaveCount(0)
})

test('admin: wszystkie widoki renderują + nawigacja pełna', async ({ page }) => {
  await login(page, 'admin@comingup.pl')

  for (const item of ['Zespół', 'Raporty', 'Szkolenia', 'Materiały', 'Wsparcie']) {
    await expect(page.getByRole('link', { name: item, exact: true })).toBeVisible()
  }

  const pages: [string, RegExp][] = [
    ['Klienci', /Klienci/],
    ['Leady', /Leady/],
    ['Aktywność', /Aktywność/],
    ['Szkolenia', /Szkolenia i baza wiedzy/],
    ['Materiały', /Materiały/],
    ['Wsparcie', /Wsparcie/],
    ['Zespół', /Zespół/],
    ['Raporty', /Raport miesięczny/],
  ]
  for (const [nav, heading] of pages) {
    await page.getByRole('link', { name: nav, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading)
  }
})

test('admin: Zespół pokazuje całą strukturę z agregatami', async ({ page }) => {
  await login(page, 'admin@comingup.pl')
  await page.getByRole('link', { name: 'Zespół', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Zespół' })).toBeVisible()
  // admin widzi wszystkich (≥ kilku) i wskaźnik „na żywo"
  await expect(page.getByText('na żywo')).toBeVisible()
  await expect(page.locator('table tbody tr').first()).toBeVisible()
  const rows = await page.locator('table tbody tr').count()
  expect(rows).toBeGreaterThan(3)
})

test('admin: karta klienta ma stepper etapów', async ({ page }) => {
  await login(page, 'admin@comingup.pl')
  await page.getByRole('link', { name: 'Klienci', exact: true }).click()
  await page.locator('table tbody tr').first().click()
  await expect(page.getByText(/Proces · etap \d+ z \d+/)).toBeVisible()
})

test('doradca (Maria): RLS + nawigacja ograniczona, brak Zespół/Raporty', async ({ page }) => {
  await login(page, 'maria@comingup.pl')

  // brak pozycji menedżerskich
  await expect(page.getByRole('link', { name: 'Zespół', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Raporty', exact: true })).toHaveCount(0)

  // RLS: doradca widzi 14 swoich klientów
  await page.getByRole('link', { name: 'Klienci', exact: true }).click()
  await expect(page.getByText(/14 widocznych/)).toBeVisible()

  // strażnik trasy: /zespol wpisany ręcznie → komunikat o braku dostępu
  await page.goto('/zespol')
  await expect(page.getByText(/dostępny dla managerów/)).toBeVisible()
})

test('Wsparcie: wyszukiwarka filtruje bazę wiedzy', async ({ page }) => {
  await login(page, 'maria@comingup.pl')
  await page.getByRole('link', { name: 'Wsparcie', exact: true }).click()
  await page.getByPlaceholder(/Szukaj/).fill('audyt')
  await expect(page.getByText(/wyników dla/)).toBeVisible()
  await expect(page.getByRole('button', { name: /audyt energetyczny/i })).toBeVisible()
})

test('Szkolenia: lista testów wiedzy widoczna', async ({ page }) => {
  await login(page, 'maria@comingup.pl')
  await page.getByRole('link', { name: 'Szkolenia', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Testy wiedzy' })).toBeVisible()
  await expect(page.getByText('Kwalifikacja CP — podstawy')).toBeVisible()
  await logout(page)
})
