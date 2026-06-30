import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { listClients, type Client } from '../lib/repo'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
if (TOKEN) mapboxgl.accessToken = TOKEN

const STATUS_COLOR: Record<string, string> = {
  active: '#7c3aed', // violet
  won: '#10b981', // emerald
  lost: '#ef4444', // red
  paused: '#f59e0b', // amber
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Aktywny',
  won: 'Wygrany',
  lost: 'Utracony',
  paused: 'Wstrzymany',
}

export default function Mapa() {
  const navigate = useNavigate()
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [clients, setClients] = useState<Client[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  // Mapa + pinezki w JEDNYM efekcie, tworzone razem gdy dane gotowe — odporne na
  // StrictMode (podwójny mont w dev) i na wyścig 'load' vs fetch.
  useEffect(() => {
    if (!TOKEN || !mapEl.current || !clients) return
    const geo = clients.filter((c) => c.lat != null && c.lng != null)

    const map = new mapboxgl.Map({
      container: mapEl.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [19.4, 52.0], // środek Polski
      zoom: 5,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    const bounds = new mapboxgl.LngLatBounds()
    for (const c of geo) {
      const popupNode = document.createElement('div')
      popupNode.style.cssText = 'font-size:13px;line-height:1.4'
      popupNode.innerHTML =
        `<div style="font-weight:600;color:#0f172a">${c.firstName} ${c.lastName}</div>` +
        `<div style="color:#64748b">${[c.city, c.province].filter(Boolean).join(', ') || ''}</div>` +
        `<div style="color:#64748b;margin-top:2px">Etap ${c.currentStage} · ${STATUS_LABEL[c.status] ?? c.status}</div>`
      const btn = document.createElement('button')
      btn.textContent = 'Otwórz kartę →'
      btn.style.cssText =
        'margin-top:6px;background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer'
      btn.onclick = () => navigate(`/klienci/${c.id}`)
      popupNode.appendChild(btn)

      new mapboxgl.Marker({ color: STATUS_COLOR[c.status] ?? '#64748b' })
        .setLngLat([c.lng!, c.lat!])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setDOMContent(popupNode))
        .addTo(map)
      bounds.extend([c.lng!, c.lat!])
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 0 })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [clients, navigate])

  if (!TOKEN)
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-slate-900">Mapa</h1>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Brak tokenu Mapbox (<code>VITE_MAPBOX_TOKEN</code>). Dodaj go w <code>app/.env.local</code>.
        </p>
      </div>
    )

  const geoCount = clients?.filter((c) => c.lat != null && c.lng != null).length

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mapa klientów</h1>
          <p className="mt-1 text-slate-500">
            Lokalizacje Twoich klientów (kolor = status). Kliknij pinezkę po szczegóły.
          </p>
        </div>
        {geoCount != null && (
          <span className="text-sm text-slate-500">{geoCount} na mapie</span>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Błąd: {error}</p>
      )}

      <div
        ref={mapEl}
        className="mt-5 h-[70vh] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
      />

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
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
