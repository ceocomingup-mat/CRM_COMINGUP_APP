import { lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { restoreSession, supabase, type Profile } from './lib/supabase'
import Login from './pages/Login'
import Layout from './components/Layout'
import Pulpit from './pages/Pulpit'
import ResetPassword from './pages/ResetPassword'
import GoalGate from './components/GoalGate'

// Strony ładowane leniwie → osobne chunki pobierane dopiero przy wejściu na trasę,
// dzięki czemu główny bundle (pierwsze wejście) jest mały. Pulpit zostaje eager
// jako pierwszy ekran po logowaniu; Suspense dla reszty jest w Layout (Outlet).
const Klienci = lazy(() => import('./pages/Klienci'))
const KlientKarta = lazy(() => import('./pages/KlientKarta'))
const Leady = lazy(() => import('./pages/Leady'))
const LeadKarta = lazy(() => import('./pages/LeadKarta'))
const Umowy = lazy(() => import('./pages/Umowy'))
const Zadania = lazy(() => import('./pages/Zadania'))
const Aktualnosci = lazy(() => import('./pages/Aktualnosci'))
const Ranking = lazy(() => import('./pages/Ranking'))
const Profil = lazy(() => import('./pages/Profil'))
const Statystyki = lazy(() => import('./pages/Statystyki'))
const Kalendarz = lazy(() => import('./pages/Kalendarz'))
const Admin = lazy(() => import('./pages/Admin'))
const Ustawienia = lazy(() => import('./pages/Ustawienia'))
const Zawody = lazy(() => import('./pages/Zawody'))
const Kalkulator = lazy(() => import('./pages/Kalkulator'))
const Zespol = lazy(() => import('./pages/Zespol'))
const Raporty = lazy(() => import('./pages/Raporty'))
const Aktywnosc = lazy(() => import('./pages/Aktywnosc'))
const Szkolenia = lazy(() => import('./pages/Szkolenia'))
const Materialy = lazy(() => import('./pages/Materialy'))
const Wsparcie = lazy(() => import('./pages/Wsparcie'))
const Mapa = lazy(() => import('./pages/Mapa'))

function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [booting, setBooting] = useState(true)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    restoreSession()
      .then((p) => setProfile(p))
      .finally(() => setBooting(false))

    // PASSWORD_RECOVERY: użytkownik wszedł z linku resetu → pokaż ekran nowego
    // hasła niezależnie od profilu. SIGNED_OUT: wygasła/odebrana sesja → logowanie.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      else if (event === 'SIGNED_OUT') setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (booting) {
    return (
      <div className="min-h-svh grid place-items-center text-steel">Ładowanie…</div>
    )
  }

  if (recovery)
    return <ResetPassword onDone={() => { setRecovery(false); setProfile(null) }} />

  if (!profile) return <Login onLoggedIn={setProfile} />

  return (
    <>
      <GoalGate profile={profile} />
      <BrowserRouter>
      <Routes>
        <Route element={<Layout profile={profile} onLogout={() => setProfile(null)} />}>
          <Route index element={<Pulpit />} />
          <Route path="klienci" element={<Klienci />} />
          <Route path="klienci/:id" element={<KlientKarta />} />
          <Route path="leady" element={<Leady />} />
          <Route path="leady/:id" element={<LeadKarta />} />
          <Route path="umowy" element={<Umowy />} />
          <Route path="zadania" element={<Zadania />} />
          <Route path="kalkulator" element={<Kalkulator />} />
          <Route path="aktualnosci" element={<Aktualnosci />} />
          <Route path="aktywnosc" element={<Aktywnosc />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="profil" element={<Profil />} />
          <Route path="statystyki" element={<Statystyki />} />
          <Route path="kalendarz" element={<Kalendarz />} />
          <Route path="admin" element={<Admin />} />
          <Route path="ustawienia" element={<Ustawienia />} />
          <Route path="zawody" element={<Zawody />} />
          <Route path="szkolenia" element={<Szkolenia />} />
          <Route path="materialy" element={<Materialy />} />
          <Route path="wsparcie" element={<Wsparcie />} />
          <Route path="mapa" element={<Mapa />} />
          <Route path="zespol" element={<Zespol />} />
          <Route path="raporty" element={<Raporty />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
