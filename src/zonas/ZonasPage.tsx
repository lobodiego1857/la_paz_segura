import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { divIcon, latLngBounds } from 'leaflet'
import type { RolUsuario, Zona } from '../types/domain'
import { supabase } from '../lib/supabase'

type TipoRiesgo = {
  id_tipo_riesgo: number
  nombre: string
}

type BorradorZona = {
  nombre: string
  direccion: string
  referencia: string
  id_tipo_riesgo: string
  latitud: string
  longitud: string
  descripcion: string
}

type ZonasPageProps = {
  rol: RolUsuario
}

const borradorVacio: BorradorZona = {
  nombre: '',
  direccion: '',
  referencia: '',
  id_tipo_riesgo: '',
  latitud: '',
  longitud: '',
  descripcion: '',
}

const iconoZona = divIcon({
  className: 'zone-map-icon',
  html: '<span></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function esZona(valor: unknown): valor is Zona {
  if (typeof valor !== 'object' || valor === null) return false
  const zona = valor as Record<string, unknown>
  return typeof zona.id_zona === 'number'
    && typeof zona.nombre === 'string'
    && (typeof zona.direccion === 'string' || zona.direccion === null)
    && (typeof zona.referencia === 'string' || zona.referencia === null)
    && typeof zona.id_tipo_riesgo === 'number'
    && typeof zona.latitud === 'number'
    && typeof zona.longitud === 'number'
    && (typeof zona.descripcion === 'string' || zona.descripcion === null)
    && typeof zona.activa === 'boolean'
    && typeof zona.fecha_registro === 'string'
}

function esTipoRiesgo(valor: unknown): valor is TipoRiesgo {
  if (typeof valor !== 'object' || valor === null) return false
  const tipo = valor as Record<string, unknown>
  return typeof tipo.id_tipo_riesgo === 'number' && typeof tipo.nombre === 'string'
}

function AjustarMapa({ zonas }: { zonas: Zona[] }) {
  const mapa = useMap()

  useEffect(() => {
    if (zonas.length === 1) {
      const [zona] = zonas
      if (zona) mapa.setView([zona.latitud, zona.longitud], 14)
    } else if (zonas.length > 1) {
      mapa.fitBounds(latLngBounds(zonas.map((zona) => [zona.latitud, zona.longitud])), { padding: [24, 24], maxZoom: 14 })
    }
  }, [mapa, zonas])

  return null
}

function SelectorCoordenadas({
  activo,
  alSeleccionar,
}: {
  activo: boolean
  alSeleccionar: (latitud: number, longitud: number) => void
}) {
  useMapEvents({
    click(evento) {
      if (activo) alSeleccionar(evento.latlng.lat, evento.latlng.lng)
    },
  })

  return null
}

function ZonasPage({ rol }: ZonasPageProps) {
  const [zonas, setZonas] = useState<Zona[]>([])
  const [tipos, setTipos] = useState<TipoRiesgo[]>([])
  const [borrador, setBorrador] = useState<BorradorZona>(borradorVacio)
  const [zonaEditada, setZonaEditada] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [recarga, setRecarga] = useState(0)

  const puedeRegistrar = rol === 'inspector'
  const zonasActivas = useMemo(() => zonas.filter((zona) => zona.activa), [zonas])
  const nombreTipo = useMemo(() => new Map(tipos.map((tipo) => [tipo.id_tipo_riesgo, tipo.nombre])), [tipos])
  const latitudBorrador = Number(borrador.latitud)
  const longitudBorrador = Number(borrador.longitud)
  const borradorTieneCoordenadas = borrador.latitud !== ''
    && borrador.longitud !== ''
    && Number.isFinite(latitudBorrador)
    && Number.isFinite(longitudBorrador)
    && latitudBorrador >= -90
    && latitudBorrador <= 90
    && longitudBorrador >= -180
    && longitudBorrador <= 180

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')

    if (!supabase) {
      setCargando(false)
      setError('Supabase no está configurado en este entorno.')
      return
    }

    void (async () => {
      try {
        const [resultadoZonas, resultadoTipos] = await Promise.all([
          supabase
            .from('zonas')
            .select('id_zona, nombre, direccion, referencia, id_tipo_riesgo, latitud, longitud, descripcion, activa, fecha_registro')
            .order('fecha_registro', { ascending: false }),
          supabase.from('tipos_riesgo').select('id_tipo_riesgo, nombre').order('nombre'),
        ])

        if (!vigente) return
        if (resultadoZonas.error || resultadoTipos.error) {
          setError('No se pudieron consultar las zonas o categorías. Comprueba la sesión y los permisos de lectura.')
          return
        }

        setZonas(Array.isArray(resultadoZonas.data) ? resultadoZonas.data.filter(esZona) : [])
        setTipos(Array.isArray(resultadoTipos.data) ? resultadoTipos.data.filter(esTipoRiesgo) : [])
      } catch {
        if (vigente) setError('No se pudo conectar con Supabase para consultar las zonas.')
      } finally {
        if (vigente) setCargando(false)
      }
    })()

    return () => {
      vigente = false
    }
  }, [recarga])

  function cambiarCampo(campo: keyof BorradorZona, valor: string) {
    setBorrador((actual) => ({ ...actual, [campo]: valor }))
    setError('')
    setMensaje('')
  }

  function iniciarEdicion(zona: Zona) {
    setZonaEditada(zona.id_zona)
    setBorrador({
      nombre: zona.nombre,
      direccion: zona.direccion ?? '',
      referencia: zona.referencia ?? '',
      id_tipo_riesgo: String(zona.id_tipo_riesgo),
      latitud: String(zona.latitud),
      longitud: String(zona.longitud),
      descripcion: zona.descripcion ?? '',
    })
    setMensaje('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicion() {
    setZonaEditada(null)
    setBorrador(borradorVacio)
    setError('')
  }

  async function guardarZona(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!supabase || !puedeRegistrar) return

    const latitud = Number(borrador.latitud)
    const longitud = Number(borrador.longitud)
    const idTipoRiesgo = Number(borrador.id_tipo_riesgo)
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud) || !Number.isFinite(idTipoRiesgo)) {
      setError('Ingresa coordenadas y una categoría válidas.')
      return
    }

    setGuardando(true)
    setError('')
    setMensaje('')
    const datos = {
      nombre: borrador.nombre.trim(),
      direccion: borrador.direccion.trim() || null,
      referencia: borrador.referencia.trim() || null,
      id_tipo_riesgo: idTipoRiesgo,
      latitud,
      longitud,
      descripcion: borrador.descripcion.trim() || null,
    }

    try {
      const resultado = zonaEditada === null
        ? await supabase.from('zonas').insert(datos).select('id_zona').maybeSingle()
        : await supabase.from('zonas').update(datos).eq('id_zona', zonaEditada).select('id_zona').maybeSingle()

      if (resultado.error || !resultado.data) {
        setError('No se pudo guardar la zona. Revisa los datos y el permiso asignado a tu rol.')
        return
      }

      setMensaje(zonaEditada === null ? 'Zona registrada correctamente.' : 'Zona actualizada correctamente.')
      setZonaEditada(null)
      setBorrador(borradorVacio)
      setRecarga((actual) => actual + 1)
    } catch {
      setError('No se pudo conectar con Supabase para guardar la zona.')
    } finally {
      setGuardando(false)
    }
  }

  async function completarNombreDesdeMapa(latitud: number, longitud: number) {
    setBorrador((actual) => ({
      ...actual,
      latitud: latitud.toFixed(6),
      longitud: longitud.toFixed(6),
    }))
    setError('')
    setMensaje('Consultando el nombre aproximado de la ubicación…')
    try {
      const respuesta = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitud}&lon=${longitud}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'es' },
      })
      if (!respuesta.ok) throw new Error('No se pudo consultar la ubicación.')
      const datos: unknown = await respuesta.json()
      if (typeof datos !== 'object' || datos === null) throw new Error('Respuesta inválida.')
      const resultado = datos as { display_name?: unknown; address?: Record<string, unknown> }
      const direccion = resultado.address
        ? [resultado.address.road, resultado.address.house_number, resultado.address.neighbourhood, resultado.address.suburb]
          .filter((parte): parte is string => typeof parte === 'string' && parte.length > 0)
          .join(', ')
        : ''
      setBorrador((actual) => ({
        ...actual,
        nombre: actual.nombre || (typeof resultado.display_name === 'string' ? resultado.display_name.split(',').slice(0, 2).join(',').trim() : ''),
        direccion: actual.direccion || direccion,
      }))
      setMensaje('Ubicación y nombre aproximado completados. Verifica y ajusta los datos antes de guardar.')
    } catch {
      setMensaje('Coordenadas completadas. No se pudo obtener el nombre automáticamente; puedes escribirlo manualmente.')
    }
  }

  return (
    <section className="zones-page">
      <div className="zones-heading">
        <div>
          <div className="eyebrow">ZONAS Y UBICACIÓN</div>
          <h1>Zonas seleccionadas</h1>
          <p>Ubicaciones registradas para inspección preventiva. No representan un inventario oficial.</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" disabled={cargando} onClick={() => setRecarga((actual) => actual + 1)} type="button">Actualizar</button>
      </div>

      {error && <div className="access-message is-error zones-message" role="alert">{error}</div>}
      {mensaje && <div className="access-message is-info zones-message" role="status">{mensaje}</div>}

      {puedeRegistrar && (
        <form className="zone-form-card" onSubmit={guardarZona}>
          <div className="zone-form-heading">
            <div>
              <div className="eyebrow">{zonaEditada === null ? 'NUEVO REGISTRO' : 'EDICIÓN TÉCNICA'}</div>
              <h2>{zonaEditada === null ? 'Registrar una zona' : 'Editar zona'}</h2>
            </div>
            {zonaEditada !== null && <button className="btn btn-link btn-sm" onClick={cancelarEdicion} type="button">Cancelar edición</button>}
          </div>

          {tipos.length === 0 && !cargando && <p className="access-message is-error">No hay categorías disponibles. Verifica la migración y vuelve a cargar.</p>}
          <div className="zone-form-grid">
            <label className="zone-field zone-field-wide">
              Nombre de la zona
              <input className="form-control" maxLength={160} onChange={(evento) => cambiarCampo('nombre', evento.target.value)} required value={borrador.nombre} />
            </label>
            <label className="zone-field">
              Categoría principal
              <select className="form-select" onChange={(evento) => cambiarCampo('id_tipo_riesgo', evento.target.value)} required value={borrador.id_tipo_riesgo}>
                <option value="">Selecciona una categoría</option>
                {tipos.map((tipo) => <option key={tipo.id_tipo_riesgo} value={tipo.id_tipo_riesgo}>{tipo.nombre}</option>)}
              </select>
            </label>
            <label className="zone-field">
              Dirección
              <input className="form-control" maxLength={240} onChange={(evento) => cambiarCampo('direccion', evento.target.value)} value={borrador.direccion} />
            </label>
            <label className="zone-field">
              Referencia
              <input className="form-control" maxLength={240} onChange={(evento) => cambiarCampo('referencia', evento.target.value)} value={borrador.referencia} />
            </label>
            <label className="zone-field">
              Latitud
              <input className="form-control" inputMode="decimal" max="90" min="-90" onChange={(evento) => cambiarCampo('latitud', evento.target.value)} required step="0.000001" type="number" value={borrador.latitud} />
            </label>
            <label className="zone-field">
              Longitud
              <input className="form-control" inputMode="decimal" max="180" min="-180" onChange={(evento) => cambiarCampo('longitud', evento.target.value)} required step="0.000001" type="number" value={borrador.longitud} />
            </label>
            <label className="zone-field zone-field-wide">
              Descripción
              <textarea className="form-control" maxLength={2000} onChange={(evento) => cambiarCampo('descripcion', evento.target.value)} rows={2} value={borrador.descripcion} />
            </label>
          </div>
          <div className="zone-form-actions">
            <span>Las coordenadas pueden introducirse manualmente; verifica su ubicación antes de guardar.</span>
            <button className="btn btn-dark-green" disabled={guardando || tipos.length === 0} type="submit">{guardando ? 'Guardando…' : zonaEditada === null ? 'Registrar zona' : 'Guardar cambios'}</button>
          </div>
        </form>
      )}

      <section className="zone-map-card">
        <div className="zone-section-heading">
          <div>
            <h2>Mapa de zonas activas</h2>
            <p>{puedeRegistrar ? 'Haz clic en el mapa para completar coordenadas y obtener un nombre aproximado, o escríbelas manualmente.' : 'El mapa usa OpenStreetMap y requiere conexión a internet.'}</p>
          </div>
          <span>{zonasActivas.length} activas</span>
        </div>
        <MapContainer className="zones-map" center={[-16.5, -68.15]} zoom={11} scrollWheelZoom>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <AjustarMapa zonas={zonasActivas} />
          <SelectorCoordenadas
            activo={puedeRegistrar}
            alSeleccionar={(latitud, longitud) => { void completarNombreDesdeMapa(latitud, longitud) }}
          />
          {zonasActivas.map((zona) => (
            <Marker icon={iconoZona} key={zona.id_zona} position={[zona.latitud, zona.longitud]}>
              <Popup>
                <strong>{zona.nombre}</strong><br />
                {nombreTipo.get(zona.id_tipo_riesgo) ?? 'Categoría no disponible'}
                {zona.direccion && <><br />{zona.direccion}</>}
              </Popup>
            </Marker>
          ))}
          {puedeRegistrar && borradorTieneCoordenadas && (
            <Marker icon={iconoZona} position={[latitudBorrador, longitudBorrador]}>
              <Popup>Ubicación seleccionada para el formulario</Popup>
            </Marker>
          )}
        </MapContainer>
        {zonasActivas.length === 0 && !cargando && <div className="map-empty-note">Aún no hay zonas activas registradas.</div>}
      </section>

      <section className="zone-list-section">
        <div className="zone-section-heading">
          <div>
            <h2>Registro de zonas</h2>
            <p>{cargando ? 'Cargando registros…' : `${zonas.length} zonas en total`}</p>
          </div>
        </div>
        {!cargando && zonas.length === 0 && <p className="users-empty">Todavía no hay zonas registradas. No se cargan ubicaciones de ejemplo.</p>}
        <div className="zone-list">
          {zonas.map((zona) => (
            <article className={`zone-card ${zona.activa ? '' : 'is-inactive'}`} key={zona.id_zona}>
              <div className="zone-card-main">
                <div className="zone-card-title-row">
                  <h3>{zona.nombre}</h3>
                  <span className={`user-status ${zona.activa ? 'is-active' : 'is-pending'}`}>{zona.activa ? 'Activa' : 'Inactiva'}</span>
                </div>
                <p className="zone-category">{nombreTipo.get(zona.id_tipo_riesgo) ?? 'Categoría no disponible'}</p>
                {(zona.direccion || zona.referencia) && <p className="zone-address">{[zona.direccion, zona.referencia].filter(Boolean).join(' · ')}</p>}
                <p className="zone-coordinates">{zona.latitud.toFixed(6)}, {zona.longitud.toFixed(6)}</p>
                {zona.descripcion && <p className="zone-description">{zona.descripcion}</p>}
              </div>
              {puedeRegistrar && (
                <div className="zone-card-actions">
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => iniciarEdicion(zona)} type="button">Editar</button>
                </div>
              )}
            </article>
          ))}
        </div>
        {!puedeRegistrar && <p className="users-footnote">Tu rol permite consultar zonas, pero no registrarlas ni modificarlas.</p>}
      </section>
    </section>
  )
}

export default ZonasPage
