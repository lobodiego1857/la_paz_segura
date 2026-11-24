import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { divIcon, latLngBounds } from 'leaflet'
import { supabase } from '../lib/supabase'

type ZonaPublica = {
  id_zona: number
  nombre: string
  direccion: string | null
  referencia: string | null
  id_tipo_riesgo: number
  latitud: number
  longitud: number
  descripcion: string | null
  activa: boolean
  fecha_registro: string
}

type InspeccionPublica = {
  id_inspeccion: number
  id_zona: number
  fecha_inspeccion: string
  observaciones: string
  nivel_atencion: 'Baja' | 'Media' | 'Alta'
  recomendaciones: string | null
  estado: 'Pendiente' | 'En seguimiento' | 'Cerrada'
  fecha_actualizacion: string
}

type SeguimientoPublico = {
  id_seguimiento: number
  id_inspeccion: number
  estado_nuevo: 'Pendiente' | 'En seguimiento' | 'Cerrada'
  comentario: string
  fecha_cambio: string
  accion: string | null
  fecha_prevista: string | null
  resultado: string | null
}

type Props = { onAccesoPersonal: () => void; visible: boolean }

const iconoZona = divIcon({
  className: 'zone-map-icon',
  html: '<span></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function AjustarMapa({ zonas, visible }: { zonas: ZonaPublica[]; visible: boolean }) {
  const mapa = useMap()

  useEffect(() => {
    if (!visible) return

    const frame = window.requestAnimationFrame(() => {
      mapa.invalidateSize({ pan: false })
      if (zonas.length === 1) {
        const zona = zonas[0]
        if (zona) mapa.setView([zona.latitud, zona.longitud], 14)
      } else if (zonas.length > 1) {
        mapa.fitBounds(latLngBounds(zonas.map((zona) => [zona.latitud, zona.longitud])), { padding: [24, 24], maxZoom: 14 })
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [mapa, visible, zonas])

  return null
}

export default function ConsultaPublica({ onAccesoPersonal, visible }: Props) {
  const [zonas, setZonas] = useState<ZonaPublica[]>([])
  const [tipos, setTipos] = useState<Array<{ id_tipo_riesgo: number; nombre: string }>>([])
  const [inspecciones, setInspecciones] = useState<InspeccionPublica[]>([])
  const [seguimientos, setSeguimientos] = useState<SeguimientoPublico[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  useEffect(() => {
    let vigente = true
    async function cargar() {
      if (!supabase) {
        setError('La consulta pública no está disponible porque falta configurar Supabase.')
        setCargando(false)
        return
      }
      setCargando(true)
      setError('')
      const [resultadoZonas, resultadoTipos, resultadoInspecciones, resultadoSeguimientos] = await Promise.all([
        supabase.from('zonas').select('id_zona, nombre, direccion, referencia, id_tipo_riesgo, latitud, longitud, descripcion, activa, fecha_registro').eq('activa', true).order('nombre'),
        supabase.from('tipos_riesgo').select('id_tipo_riesgo, nombre').order('nombre'),
        supabase.from('inspecciones').select('id_inspeccion, id_zona, fecha_inspeccion, observaciones, nivel_atencion, recomendaciones, estado, fecha_actualizacion').order('fecha_inspeccion', { ascending: false }),
        supabase.from('seguimientos').select('id_seguimiento, id_inspeccion, estado_nuevo, comentario, fecha_cambio, accion, fecha_prevista, resultado').order('fecha_cambio', { ascending: false }),
      ])
      if (!vigente) return
      if (resultadoZonas.error || resultadoTipos.error || resultadoInspecciones.error || resultadoSeguimientos.error) {
        setError('No se pudo cargar la consulta pública. Verifica que la migración de consulta pública esté aplicada.')
        setCargando(false)
        return
      }
      setZonas((resultadoZonas.data ?? []) as ZonaPublica[])
      setTipos((resultadoTipos.data ?? []) as Array<{ id_tipo_riesgo: number; nombre: string }>)
      setInspecciones((resultadoInspecciones.data ?? []) as InspeccionPublica[])
      setSeguimientos((resultadoSeguimientos.data ?? []) as SeguimientoPublico[])
      setCargando(false)
    }
    void cargar()
    return () => { vigente = false }
  }, [])

  const nombreTipo = useMemo(() => new Map(tipos.map((tipo) => [tipo.id_tipo_riesgo, tipo.nombre])), [tipos])
  const nombreZona = useMemo(() => new Map(zonas.map((zona) => [zona.id_zona, zona.nombre])), [zonas])
  const inspeccionesVisibles = inspecciones.filter((inspeccion) => !filtroEstado || inspeccion.estado === filtroEstado)

  return (
    <main className="public-page">
      <header className="public-topbar">
        <div className="public-brand">
          <img src="/favicon.svg" alt="" />
          <div><strong>La Paz Segura</strong><span>Consulta pública</span></div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={onAccesoPersonal} type="button">Acceso personal</button>
      </header>

      <div className="public-content">
        <section className="public-hero">
          <div className="eyebrow">INFORMACIÓN ABIERTA</div>
          <h1>Zonas de riesgo e inspecciones</h1>
          <p>Consulta el estado operativo de las zonas activas y el historial público de actuaciones. Esta información no constituye un diagnóstico profesional ni un inventario oficial.</p>
        </section>

        {error && <div className="access-message is-error" role="alert">{error}</div>}
        {cargando && <p className="users-empty" role="status">Cargando información pública…</p>}

        {!cargando && (
          <>
            <section className="public-summary">
              <article><strong>{zonas.length}</strong><span>Zonas activas</span></article>
              <article><strong>{inspecciones.length}</strong><span>Inspecciones públicas</span></article>
              <article><strong>{seguimientos.length}</strong><span>Actuaciones registradas</span></article>
            </section>

            <section className="public-map-card">
              <div className="zone-section-heading">
                <div><h2>Mapa de zonas activas</h2><p>Ubicaciones publicadas para consulta.</p></div>
                <span>{zonas.length} zonas</span>
              </div>
              <MapContainer className="zones-map" center={[-16.5, -68.15]} zoom={11} scrollWheelZoom>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <AjustarMapa zonas={zonas} visible={visible} />
                {zonas.map((zona) => (
                  <Marker icon={iconoZona} key={zona.id_zona} position={[zona.latitud, zona.longitud]}>
                    <Popup>
                      <strong>{zona.nombre}</strong><br />
                      {nombreTipo.get(zona.id_tipo_riesgo) ?? 'Categoría no disponible'}
                      {zona.direccion && <><br />{zona.direccion}</>}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </section>

            <section className="public-inspections">
              <div className="zone-section-heading">
                <div><h2>Inspecciones y seguimiento</h2><p>{inspeccionesVisibles.length} registros visibles</p></div>
                <select className="form-select public-filter" value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value)} aria-label="Filtrar por estado">
                  <option value="">Todos los estados</option>
                  <option>Pendiente</option>
                  <option>En seguimiento</option>
                  <option>Cerrada</option>
                </select>
              </div>
              {inspeccionesVisibles.length === 0 ? (
                <p className="users-empty">No hay inspecciones visibles con este filtro.</p>
              ) : (
                <div className="public-inspection-list">
                  {inspeccionesVisibles.map((inspeccion) => {
                    const historial = seguimientos.filter((item) => item.id_inspeccion === inspeccion.id_inspeccion)
                    return (
                      <article className="public-inspection-card" key={inspeccion.id_inspeccion}>
                        <div className="public-inspection-heading">
                          <div>
                            <span className="eyebrow">INSPECCIÓN {inspeccion.id_inspeccion}</span>
                            <h3>{nombreZona.get(inspeccion.id_zona) ?? `Zona ${inspeccion.id_zona}`}</h3>
                          </div>
                          <span className={`public-status is-${inspeccion.estado === 'Cerrada' ? 'closed' : inspeccion.estado === 'En seguimiento' ? 'progress' : 'pending'}`}>{inspeccion.estado}</span>
                        </div>
                        <dl className="public-facts">
                          <div><dt>Fecha</dt><dd>{inspeccion.fecha_inspeccion}</dd></div>
                          <div><dt>Prioridad operativa</dt><dd>{inspeccion.nivel_atencion}</dd></div>
                        </dl>
                        <p><strong>Observaciones:</strong> {inspeccion.observaciones}</p>
                        {inspeccion.recomendaciones && <p><strong>Recomendaciones:</strong> {inspeccion.recomendaciones}</p>}
                        {historial.length > 0 && (
                          <ol className="public-history">
                            {historial.map((item) => (
                              <li key={item.id_seguimiento}>
                                <div><strong>{item.estado_nuevo}</strong><time>{new Date(item.fecha_cambio).toLocaleString('es-BO')}</time></div>
                                {item.accion && <p><strong>Acción:</strong> {item.accion}</p>}
                                <p>{item.comentario}</p>
                                {item.resultado && <p><strong>Resultado:</strong> {item.resultado}</p>}
                              </li>
                            ))}
                          </ol>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
