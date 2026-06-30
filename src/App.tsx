import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { restoreSession, type Profile } from './lib/supabase'
import Login from './pages/Login'
import Layout from './components/Layout'
import Pulpit from './pages/Pulpit'
import Klienci from './pages/Klienci'
import KlientKarta from './pages/KlientKarta'
import Leady from './pages/Leady'
import LeadKarta from './pages/LeadKarta'
import Umowy from './pages/Umowy'
import Zadania from './pages/Zadania'
import Aktualnosci from './pages/Aktualnosci'
import Ranking from './pages/Ranking'
import Profil from './pages/Profil'
import Statystyki from './pages/Statystyki'
import Kalendarz from './pages/Kalendarz'
import Admin from './pages/Admin'
import Ustawienia from './pages/Ustawienia'
import Kalkulator from './pages/Kalkulator'
import Zespol from './pages/Zespol'
import Raporty from './pages/Raporty'
import Aktywnosc from './pages/Aktywnosc'
import Szkolenia from './pages/Szkolenia'
import Materialy from './pages/Materialy'
import Wsparcie from './pages/Wsparcie'
// Mapa ciągnie ciężki mapbox-gl → lazy, ładowany dopiero przy wejściu na /mapa.
const Mapa = lazy(() => import('./pages/Mapa'))
import GoalGate from './components/GoalGate'

function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    restoreSession()
      .then((p) => setProfile(p))
      .finally(() => setBooting(false))
  }, [])

  if (booting) {
    return (
      <div className="min-h-svh grid place-items-center text-steel">Ładowanie…</div>
    )
  }

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
          <Route path="szkolenia" element={<Szkolenia />} />
          <Route path="materialy" element={<Materialy />} />
          <Route path="wsparcie" element={<Wsparcie />} />
          <Route
            path="mapa"
            element={
              <Suspense fallback={<p className="text-steel">Wczytywanie mapy…</p>}>
                <Mapa />
              </Suspense>
            }
          />
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
