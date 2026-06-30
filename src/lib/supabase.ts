/* ============================================================================
 *  supabase.ts — klient Supabase + warstwa logowania dla frontu (B4.1)
 * ----------------------------------------------------------------------------
 *  Jeden współdzielony klient: po zalogowaniu JWT jedzie do każdego zapytania,
 *  więc RLS (B1.4) działa od strony aplikacji. Klucz publishable jest bezpieczny
 *  w przeglądarce (po włączeniu RLS). Dane połączenia: B1.1_Supabase_Connection.md.
 *
 *  B4.1 = ekran logowania + dowód, że RLS działa (liczniki widocznych danych).
 *  Pełna warstwa repozytorium (mapowanie wszystkich encji) → B4.2.
 * ========================================================================== */
import { createClient, type Session } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kkltdvzxkecqzfczkmeo.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_c9kt3uCcypq1N0Jhga04wQ_x577IwzA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})

/* Profil zalogowanego użytkownika (z public.users, po auth_user_id). */
export interface Profile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  rank: string | null
}

export interface SignInResult {
  ok: boolean
  profile?: Profile
  error?: string
}

/* Doładuj profil z public.users dla danego auth.uid(). RLS przepuszcza
 * własny wiersz; brak profilu = konto bez powiązania → odrzucamy (jak B2.1). */
async function loadProfile(authUid: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role, rank')
    .eq('auth_user_id', authUid)
    .maybeSingle()
  if (error || !data) return null
  return {
    id: data.id,
    email: data.email,
    firstName: data.first_name ?? '',
    lastName: data.last_name ?? '',
    role: data.role,
    rank: data.rank ?? null,
  }
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) return { ok: false, error: translateError(error.message) }
  const profile = data.user ? await loadProfile(data.user.id) : null
  if (!profile) {
    await supabase.auth.signOut()
    return { ok: false, error: 'To konto nie jest powiązane z profilem w systemie.' }
  }
  return { ok: true, profile }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

/* Odtwórz sesję przy starcie aplikacji (np. po odświeżeniu strony). */
export async function restoreSession(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession()
  const session: Session | null = data.session
  if (!session?.user) return null
  return loadProfile(session.user.id)
}

/* Ile rekordów widzi zalogowany użytkownik (dowód działania RLS). */
export async function visibleCount(table: 'clients' | 'leads'): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error) return -1
  return count ?? 0
}

function translateError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Błędny e-mail lub hasło.'
  if (/email not confirmed/i.test(msg)) return 'Konto niepotwierdzone.'
  return msg
}
