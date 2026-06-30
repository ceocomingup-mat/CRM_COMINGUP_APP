import { test, expect, type Page } from '@playwright/test'

// Pokrycie E2E dla widoków dodanych po pierwszej rundzie (Admin, Zawody,
// Ustawienia, Mapa). Read-only — nic nie zapisuje na żywej bazie.
const PASS = 'demo123'

async function login(page: Page, email: string) {
  await page.goto('/')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(PASS)
  await page.getByRole('button', { name: 'Zaloguj się' }).click()
  // „Wyloguj" jest TYLKO w sidebarze po zalogowaniu (≠ „ComingUP CRM", które
  // widnieje też na ekranie logowania) → pewny sygnał, że sesja jest gotowa.
  await expect(page.getByRole('button', { name: 'Wyloguj' })).toBeVisible()
}

test('Admin: administrator widzi panel kont, doradca jest zablokowany', async ({ page }) => {
  // admin — pozycja menu + tabela kont
  await login(page, 'admin@comingup.pl')
  await expect(page.getByRole('link', { name: 'Administracja', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Administracja', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Administracja/)
  await expect(page.locator('table tbody tr').first()).toBeVisible() // poczekaj na dociągnięcie kont
  const rows = await page.locator('table tbody tr').count()
  expect(rows).toBeGreaterThan(3)

  // doradca — brak pozycji menu i strażnik trasy
  await page.getByRole('button', { name: 'Wyloguj' }).click()
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await login(page, 'maria@comingup.pl')
  await expect(page.getByRole('link', { name: 'Administracja', exact: true })).toHaveCount(0)
  await page.goto('/admin')
  await expect(page.getByText(/dostępny tylko dla administratorów/)).toBeVisible()
})

test('Zawody: aktywny konkurs z rankingiem + zwycięzca zamkniętego', async ({ page }) => {
  await login(page, 'admin@comingup.pl')
  await page.getByRole('link', { name: 'Zawody', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Zawody')
  // aktywny konkurs MM + ranking (admin widzi pełny)
  await expect(page.getByText(/Czerwcowa Masa Marży/)).toBeVisible()
  await expect(page.getByText('Maria Kowalska').first()).toBeVisible()
  // zamknięty konkurs ze zwycięzcą
  await expect(page.getByText('Zwycięzca')).toBeVisible()
  await expect(page.getByText(/Ewa Mazur/).first()).toBeVisible()
})

test('Ustawienia: sekcje konta + walidacja zmiany hasła', async ({ page }) => {
  await login(page, 'maria@comingup.pl')
  await page.getByRole('link', { name: 'Ustawienia', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ustawienia')

  // sekcje
  for (const s of ['Bezpieczeństwo', 'Adres bazy dojazdu', 'Dane kontaktowe', 'Regiony (województwa)']) {
    await expect(page.getByText(s, { exact: true })).toBeVisible()
  }

  // walidacja: za krótkie hasło + niezgodność → przycisk zablokowany
  const pwd = page.locator('input[type="password"]')
  await pwd.nth(0).fill('abc')
  await expect(page.getByText(/min\. 6 znaków/)).toBeVisible()
  await pwd.nth(0).fill('abcdef')
  await pwd.nth(1).fill('abcdeX')
  await expect(page.getByText(/nie są identyczne/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zmień hasło' })).toBeDisabled()
})

test('Mapa: widok renderuje, podpowiedź o bazie dojazdu bez ustawionego adresu', async ({ page }) => {
  await login(page, 'maria@comingup.pl')
  await page.getByRole('link', { name: 'Mapa', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Mapa klientów')
  // bez bazy dojazdu pokazuje podpowiedź, by ją ustawić w Ustawieniach
  await expect(page.getByText(/adres bazy dojazdu/i)).toBeVisible()
})
