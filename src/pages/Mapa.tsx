import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useProfile } from '../components/Layout'
import { listClients, getUser, matrixFromBase, type Client, type UserFull, type BaseDistance } from '../lib/repo'

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

function fmtDist(d: BaseDistance): string {
  if (d.meters == null) return ''
  const km = d.meters >= 1000 ? `${(d.meters / 1000).toFixed(1)} km` : `${Math.round(d.meters)} m`
  const min = d.seconds == null ? '' : ` · ${Math.max(1, Math.round(d.seconds / 60))} min`
  return `🚗 ${km}${min} od bazy`
}

export default function Mapa() {
  const profile = useProfile()
  const navigate = useNavigate()
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [clients, setClients] = useState<Client[] | null>(null)
  const [user, setUser] = useState<UserFull | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listClients(), getUser(profile.id)])
      .then(([cs, u]) => { setClients(cs); setUser(u) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [profile.id])

  // Mapa + pinezki w JEDNYM efekcie (odporne na StrictMode). Dystanse od bazy
  // liczymy PRZED budową mapy (await Matrix) i wstrzykujemy do dymków.
  useEffect(() => {
    if (!TOKEN || !mapEl.current || !clients) return
    let cancelled = false
    let map: mapboxgl.Map | null = null

    ;(async () => {
      const geo = clients.filter((c) => c.lat != null && c.lng != null)
      const base =
        user?.homeLat != null && user?.homeLng != null
          ? { lat: user.homeLat, lng: user.homeLng }
          : null

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
  }, [clients, user, navigate])

  if (!TOKEN)
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-cream">Mapa</h1>
        <p className="mt-4 rounded-lg bg-warn/15 px-3 py-2 text-sm text-warn">
          Brak tokenu Mapbox (<code>VITE_MAPBOX_TOKEN</code>). Dodaj go w <code>app/.env.local</code>.
        </p>
      </div>
    )

  const geoCount = clients?.filter((c) => c.lat != null && c.lng != null).length
  const hasBase = user?.homeLat != null && user?.homeLng != null

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-cream">Mapa klientów</h1>
          <p className="mt-1 text-steel">
            Lokalizacje Twoich klientów (kolor = status). Kliknij pinezkę po szczegóły
            {hasBase ? ' i dystans dojazdu' : ''}.
          </p>
        </div>
        {geoCount != null && <span className="text-sm text-steel">{geoCount} na mapie</span>}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">Błąd: {error}</p>
      )}

      {!hasBase && (
        <p className="mt-4 rounded-lg bg-cardhi/60 px-3 py-2 text-sm text-muted">
          Ustaw <span className="font-medium text-cream">adres bazy dojazdu</span> w Ustawieniach, a
          policzę dystans i czas dojazdu do każdego klienta.
        </p>
      )}

      <div
        ref={mapEl}
        className="mt-5 h-[70vh] w-full overflow-hidden rounded-2xl border border-line shadow-sm"
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
  )
}
