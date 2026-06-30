// Polskie etykiety dla surowych wartości słownikowych (źródło/produkt/status MM).
export const SOURCE_LABEL: Record<string, string> = {
  referral: 'Polecenie',
  polecenie: 'Polecenie',
  D2D: 'Door-to-door',
  d2d: 'Door-to-door',
  FB_campaign: 'Kampania FB',
  FB: 'Facebook',
  own_campaign: 'Kampania własna',
  solectwo: 'Sołectwo',
  web: 'Strona WWW',
}
export const PRODUCT_LABEL: Record<string, string> = {
  pompa: 'Pompa ciepła',
  pompa_ciepla: 'Pompa ciepła',
  termo: 'Termomodernizacja',
  termo_pompa: 'Termo + pompa',
  pelet: 'Kocioł na pelet',
  fotowoltaika: 'Fotowoltaika',
}
export const MM_STATUS_LABEL: Record<string, string> = {
  approved: 'Zatwierdzona',
  none: '—',
  pending: 'Oczekuje',
  rejected: 'Odrzucona',
}

// Zwróć polską etykietę lub surową wartość (z dużej litery) jako fallback.
export function label(map: Record<string, string>, v: string | null): string | null {
  if (!v) return v
  return map[v] ?? v.charAt(0).toUpperCase() + v.slice(1)
}
