import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useProfile } from '../components/Layout'
import {
  listClients,
  getUser,
  matrixFromBase,
  optimizeRoute,
  type Client,
  type UserFull,
  type BaseDistance,
  type OptimizedRoute,
} from '../lib/repo'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
if (TOKEN) mapboxgl.accessToken = TOKEN

// Paleta statusów spójna z design systemem (go/warn/bad/info).
const STATUS_COLOR: Record<string, string> = {
  active: '#56a0e6', // info
  won: '#33cf86', // go
  lost: '#ef5b60', // bad
  paused: '#e6ad42', // warn
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Aktywny',
  won: 'Wygrany',
  lost: 'Utracony',
  paused: 'Wstrzymany',
}
const BASE_COLOR = '#dca33c' // brass
const MAX_STOPS = 11 // limit Mapbox Optimization API (12 współrzędnych = baza + 11)

function fmtDist(d: BaseDistance): string {
  if (d.meters == null) return ''
  const km = d.meters >= 1000 ? `${(d.meters / 1000).toFixed(1)} km` : `${Math.round(d.meters)} m`
  const min = d.seconds == null ? '' : ` · ${Math.max(1, Math.round(d.seconds / 60))} min`
  return `🚗 ${km}${min} od bazy`
}
function fmtKm(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}
function fmtMin(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

export default function Mapa() {
  const profile = useProfile()
  const navigate = useNavigate()
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [clients, setClients] = useState<Client[] | null>(null)
  const [user, setUser] = useState<UserFull | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Planer trasy
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [route, setRoute] = useState<(OptimizedRoute & { stops: Client[] }) | null>(null)
  const [planning, setPlanning] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listClients(), getUser(profile.id)])
      .then(([cs, u]) => { setClients(cs); setUser(u) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [profile.id])

  const base = useMemo(
    () => (user?.homeLat != null && user?.homeLng != null ? { lat: user.homeLat, lng: user.homeLng } : null),
    [user],
  )
  const geoClients = useMemo(() => (clients ?? []).filter((c) => c.lat != null && c.lng != null), [clients])

  // Mapa + pinezki w JEDNYM efekcie (odporne na StrictMode). Dystanse od bazy
  // liczymy PRZED budową mapy (await Matrix) i wstrzykujemy do dymków.
  useEffect(() => {
    if (!TOKEN || !mapEl.current || !clients) return
    let cancelled = false
    let map: mapboxgl.Map | null = null

    ;(async () => {
      const geo = clients.filter((c) => c.lat != null && c.lng != null)

      let dists: BaseDistance[] = []
      if (base && geo.length) {
        try {
          dists = await matrixFromBase(base, geo.map((c) => ({ lat: c.lat!, lng: c.lng! })))
        } catch {
          dists = [] // brak macierzy → po prostu bez dystansów
        }
      }
      if (cancelled || !mapEl.current) return

      const m = new mapboxgl.Map({
        container: mapEl.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [19.4, 52.0],
        zoom: 5,
      })
      map = m
      mapRef.current = m
      m.addControl(new mapboxgl.NavigationControl(), 'top-right')

      const bounds = new mapboxgl.LngLatBounds()

      // Marker bazy dojazdu
      if (base) {
        const baseNode = document.createElement('div')
        baseNode.style.cssText = 'font-size:13px;line-height:1.4'
        baseNode.innerHTML =
          `<div style="font-weight:600;color:#1a1208">⌂ Twoja baza dojazdu</div>` +
          `<div style="color:#475569;margin-top:2px">${user?.homeAddress ?? ''}</div>`
        new mapboxgl.Marker({ color: BASE_COLOR })
          .setLngLat([base.lng, base.lat])
          .setPopup(new mapboxgl.Popup({ offset: 24 }).setDOMContent(baseNode))
          .addTo(m)
        bounds.extend([base.lng, base.lat])
      }

      geo.forEach((c, idx) => {
        const popupNode = document.createElement('div')
        popupNode.style.cssText = 'font-size:13px;line-height:1.4'
        const distText = dists[idx] ? fmtDist(dists[idx]) : ''
        popupNode.innerHTML =
          `<div style="font-weight:600;color:#0f172a">${c.firstName} ${c.lastName}</div>` +
          `<div style="color:#64748b">${[c.city, c.province].filter(Boolean).join(', ') || ''}</div>` +
          `<div style="color:#64748b;margin-top:2px">Etap ${c.currentStage} · ${STATUS_LABEL[c.status] ?? c.status}</div>` +
          (distText ? `<div style="color:#a06a12;font-weight:600;margin-top:3px">${distText}</div>` : '')
        const btn = document.createElement('button')
        btn.textContent = 'Otwórz kartę →'
        btn.style.cssText =
          'margin-top:6px;background:#dca33c;color:#1a1208;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer'
        btn.onclick = () => navigate(`/klienci/${c.id}`)
        popupNode.appendChild(btn)

        new mapboxgl.Marker({ color: STATUS_COLOR[c.status] ?? '#64748b' })
          .setLngLat([c.lng!, c.lat!])
          .setPopup(new mapboxgl.Popup({ offset: 24 }).setDOMContent(popupNode))
          .addTo(m)
        bounds.extend([c.lng!, c.lat!])
      })

      if (!bounds.isEmpty()) m.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 0 })
    })()

    return () => {
      cancelled = true
      map?.remove()
      mapRef.current = null
    }
  }, [clients, base, user, navigate])

  // Rysowanie/odrysowanie trasy z planera (osobny efekt — nie przebudowuje mapy).
  useEffect(() => {
    const m = mapRef.current
    if (!m) return
    const SRC = 'planned-route'
    const draw = () => {
      if (m.getLayer(SRC)) m.removeLayer(SRC)
      if (m.getSource(SRC)) m.removeSource(SRC)
      if (!route) return
      m.addSource(SRC, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: route.geometry },
      })
      m.addLayer({
        id: SRC,
        type: 'line',
        source: SRC,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': BASE_COLOR, 'line-width': 4, 'line-opacity': 0.85 },
      })
      const b = new mapboxgl.LngLatBounds()
      route.geometry.coordinates.forEach((c) => b.extend(c as [number, number]))
      if (!b.isEmpty()) m.fitBounds(b, { padding: 70, maxZoom: 13, duration: 400 })
    }
    if (m.isStyleLoaded()) draw()
    else m.once('load', draw)
    return () => {
      const mm = mapRef.current
      if (mm && mm.getLayer(SRC)) {
        try { mm.removeLayer(SRC); mm.removeSource(SRC) } catch { /* mapa już usunięta */ }
      }
    }
  }, [route])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_STOPS) next.add(id)
      return next
    })
  }

  async function plan() {
    if (!base || selected.size === 0) return
    setPlanning(true); setPlanError(null)
    try {
      const stops = geoClients.filter((c) => selected.has(c.id))
      const r = await optimizeRoute(base, stops.map((c) => ({ lat: c.lat!, lng: c.lng! })))
      if (!r) {
        setPlanError('Nie udało się wyznaczyć trasy dla wybranych punktów.')
        return
      }
      setRoute({ ...r, stops })
    } catch (e: unknown) {
      setPlanError(e instanceof Error ? e.message : String(e))
    } finally {
      setPlanning(false)
    }
  }

  function clearRoute() {
    setRoute(null); setSelected(new Set()); setPlanError(null)
  }

  if (!TOKEN)
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-cream">Mapa</h1>
        <p className="mt-4 rounded-lg bg-warn/15 px-3 py-2 text-sm text-warn">
          Brak tokenu Mapbox (<code>VITE_MAPBOX_TOKEN</code>). Dodaj go w <code>app/.env.local</code>.
        </p>
      </div>
    )

  const hasBase = base != null
  const orderedStops = route ? route.order.map((i) => route.stops[i]) : []

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="kicker">Narzędzia</div>
          <h1 className="text-2xl font-semibold text-cream">Mapa klientów</h1>
          <p className="mt-1 text-steel">
            Lokalizacje Twoich klientów (kolor = status). Kliknij pinezkę po szczegóły
            {hasBase ? ' i dystans dojazdu' : ''}.
          </p>
        </div>
        {clients != null && <span className="text-sm text-steel">{geoClients.length} na mapie</span>}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}

      {!hasBase && (
        <p className="mt-4 rounded-lg bg-cardhi/60 px-3 py-2 text-sm text-muted">
          Ustaw <span className="font-medium text-cream">adres bazy dojazdu</span> w Ustawieniach, a
          policzę dystans, czas dojazdu i optymalną trasę do klientów.
        </p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          <div
            ref={mapEl}
            className="h-[68vh] w-full overflow-hidden rounded-2xl border border-line shadow-sm"
          />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-steel">
            {hasBase && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ background: BASE_COLOR }} />
                Baza dojazdu
              </span>
            )}
            {Object.entries(STATUS_LABEL).map(([k, label]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLOR[k] }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Planer trasy */}
        {hasBase && (
          <aside className="rounded-2xl border border-line bg-card p-4 shadow-sm">
            <div className="text-sm font-semibold text-cream">Planer trasy</div>
            <p className="mt-1 text-xs text-steel">
              Zaznacz klientów do odwiedzenia (do {MAX_STOPS}). Wyznaczę optymalną kolejność od bazy
              i z powrotem.
            </p>

            {route ? (
              <div className="mt-3">
                <div className="rounded-lg bg-brass/10 px-3 py-2 text-sm text-cream">
                  <span className="font-semibold text-brass">{fmtKm(route.distance)}</span> ·{' '}
                  {fmtMin(route.duration)} · {orderedStops.length}{' '}
                  {orderedStops.length === 1 ? 'przystanek' : 'przystanków'}
                </div>
                <ol className="mt-3 space-y-1.5">
                  <li className="flex items-center gap-2 text-xs text-steel">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brass font-display text-[10px] font-bold text-ink">
                      ⌂
                    </span>
                    Baza dojazdu
                  </li>
                  {orderedStops.map((c, idx) => (
                    <li key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface font-display text-[10px] font-bold text-cream">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => navigate(`/klienci/${c.id}`)}
                        className="truncate text-left text-muted hover:text-brass"
                      >
                        {c.firstName} {c.lastName}
                        <span className="text-steel"> · {c.city || c.province || ''}</span>
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  onClick={clearRoute}
                  className="mt-3 w-full rounded-lg border border-line2 px-3 py-2 text-sm text-muted transition hover:bg-surface"
                >
                  Wyczyść trasę
                </button>
              </div>
            ) : (
              <>
                <div className="mt-3 max-h-[44vh] space-y-1 overflow-y-auto pr-1">
                  {geoClients.length === 0 && (
                    <p className="text-xs italic text-steel">Brak klientów z lokalizacją.</p>
                  )}
                  {geoClients.map((c) => {
                    const on = selected.has(c.id)
                    const disabled = !on && selected.size >= MAX_STOPS
                    return (
                      <label
                        key={c.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
                          on ? 'bg-brass/10' : 'hover:bg-surface'
                        } ${disabled ? 'opacity-40' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={disabled}
                          onChange={() => toggle(c.id)}
                          className="accent-brass"
                        />
                        <span className="truncate text-cream">
                          {c.firstName} {c.lastName}
                          <span className="text-steel"> · {c.city || c.province || ''}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
                {planError && (
                  <p className="mt-2 rounded-lg bg-bad/15 px-3 py-2 text-xs text-bad">{planError}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-steel">
                    {selected.size}/{MAX_STOPS} wybranych
                  </span>
                  <button
                    onClick={plan}
                    disabled={planning || selected.size === 0}
                    className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-brass2 disabled:opacity-40"
                  >
                    {planning ? 'Liczę…' : 'Zaplanuj trasę'}
                  </button>
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
