import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { EstadoSeguimiento, Inspeccion, RolUsuario, Seguimiento, Zona } from '../types/domain'
import { supabase } from '../lib/supabase'

type SeguimientoPageProps = { idUsuario: string; rol: RolUsuario }
type SeguimientoBorrador = { id_inspeccion: number; estado: EstadoSeguimiento; comentario: string; accion: string; fecha_prevista: string; resultado: string }

const borradorInicial: SeguimientoBorrador = { id_inspeccion: 0, estado: 'En seguimiento', comentario: '', accion: '', fecha_prevista: '', resultado: '' }
const estados: EstadoSeguimiento[] = ['Pendiente', 'En seguimiento', 'Cerrada']

function SeguimientoPage({ idUsuario, rol }: SeguimientoPageProps) {
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([])
  const [zonas, setZonas] = useState<Zona[]>([])
  const [historial, setHistorial] = useState<Seguimiento[]>([])
  const [borrador, setBorrador] = useState(borradorInicial)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [recarga, setRecarga] = useState(0)

  const inspeccionesPorId = useMemo(() => new Map(inspecciones.map((i) => [i.id_inspeccion, i])), [inspecciones])
  const zonaPorId = useMemo(() => new Map(zonas.map((z) => [z.id_zona, z.nombre])), [zonas])

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')
    if (!supabase) {
      setError('Supabase no está configurado en este entorno.')
      setCargando(false)
      return
    }
    void (async () => {
      try {
        const [rInspecciones, rZonas, rHistorial] = await Promise.all([
          supabase.from('inspecciones').select('id_inspeccion, id_zona, id_usuario, fecha_inspeccion, observaciones, nivel_atencion, recomendaciones, estado, fecha_actualizacion').order('fecha_actualizacion', { ascending: false }),
          supabase.from('zonas').select('id_zona, nombre, direccion, referencia, id_tipo_riesgo, latitud, longitud, descripcion, activa, fecha_registro').order('nombre'),
          supabase.from('seguimientos').select('id_seguimiento, id_inspeccion, id_usuario, estado_nuevo, comentario, fecha_cambio, accion, fecha_prevista, resultado').order('fecha_cambio', { ascending: false }),
        ])
        if (!vigente) return
        if (rInspecciones.error || rZonas.error || rHistorial.error) {
          setError('No se pudo consultar el historial. Comprueba tu sesión y las políticas de lectura.')
          return
        }
        setInspecciones((rInspecciones.data ?? []) as Inspeccion[])
        setZonas((rZonas.data ?? []) as Zona[])
        setHistorial((rHistorial.data ?? []) as Seguimiento[])
      } catch {
        if (vigente) setError('No se pudo conectar con Supabase para cargar el historial.')
      } finally {
        if (vigente) setCargando(false)
      }
    })()
    return () => { vigente = false }
  }, [recarga])

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const inspeccion = inspeccionesPorId.get(borrador.id_inspeccion)
    if (!supabase || !inspeccion) return
    if (rol !== 'inspector' || inspeccion.id_usuario !== idUsuario) {
      setError('No tienes permiso para dar seguimiento a esta inspección.')
      return
    }
    if (borrador.estado === 'Cerrada') {
      setError('El Inspector no puede cerrar una inspección.')
      return
    }
    if (inspeccion.estado === 'Cerrada') {
      setError('El Inspector no puede reabrir una inspección cerrada.')
      return
    }
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const { error: errorRpc } = await supabase.rpc('registrar_seguimiento', {
        p_id_inspeccion: borrador.id_inspeccion,
        p_estado_nuevo: borrador.estado,
        p_comentario: borrador.comentario.trim(),
        p_accion: borrador.accion.trim() || null,
        p_fecha_prevista: borrador.fecha_prevista || null,
        p_resultado: borrador.resultado.trim() || null,
      })
      if (errorRpc) {
        setError('No se pudo registrar la actuación. La base de datos debe validar el rol, la propiedad y el comentario.')
        return
      }
      setMensaje('Actuación e historial registrados junto con el cambio de estado.')
      setBorrador(borradorInicial)
      setRecarga((actual) => actual + 1)
    } catch {
      setError('No se pudo completar la actuación. Comprueba la conexión e inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return <section className="followup-page">
    <header className="inspections-heading">
      <div><div className="eyebrow">SEGUIMIENTO E HISTORIAL</div><h1>Actuaciones registradas</h1><p>El estado y su entrada de historial se guardan mediante una operación transaccional.</p></div>
      <button className="btn btn-outline-secondary btn-sm" disabled={cargando} onClick={() => setRecarga((v) => v + 1)} type="button">Actualizar</button>
    </header>
    {error && <div className="access-message is-error" role="alert">{error}</div>}
    {mensaje && <div className="access-message is-info" role="status">{mensaje}</div>}
    {rol === 'inspector' && inspecciones.length > 0 && <form className="inspection-form-card" onSubmit={registrar}>
      <div className="eyebrow">NUEVA ACTUACIÓN</div><h2>Actualizar seguimiento</h2>
      <div className="inspection-form-grid">
        <label className="zone-field">Inspección<select className="form-select" required value={borrador.id_inspeccion || ''} onChange={(e) => setBorrador({ ...borrador, id_inspeccion: Number(e.target.value) })}><option value="">Selecciona una inspección</option>{inspecciones.filter((i) => i.id_usuario === idUsuario).map((i) => <option key={i.id_inspeccion} value={i.id_inspeccion}>{zonaPorId.get(i.id_zona) ?? `Zona ${i.id_zona}`} · {i.fecha_inspeccion} · {i.estado}</option>)}</select></label>
        <label className="zone-field">Estado resultante<select className="form-select" required value={borrador.estado} onChange={(e) => setBorrador({ ...borrador, estado: e.target.value as EstadoSeguimiento })}>{estados.filter((estado) => estado !== 'Cerrada').map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select><small>El Inspector puede actualizar casos sin cerrarlos.</small></label>
        <label className="zone-field inspection-field-wide">Comentario obligatorio<textarea className="form-control" maxLength={4000} minLength={1} required rows={3} value={borrador.comentario} onChange={(e) => setBorrador({ ...borrador, comentario: e.target.value })} /></label>
        <label className="zone-field">Acción realizada<input className="form-control" maxLength={500} value={borrador.accion} onChange={(e) => setBorrador({ ...borrador, accion: e.target.value })} /></label>
        <label className="zone-field">Fecha prevista<input className="form-control" type="date" value={borrador.fecha_prevista} onChange={(e) => setBorrador({ ...borrador, fecha_prevista: e.target.value })} /></label>
        <label className="zone-field inspection-field-wide">Resultado<textarea className="form-control" maxLength={4000} rows={2} value={borrador.resultado} onChange={(e) => setBorrador({ ...borrador, resultado: e.target.value })} /></label>
      </div>
      <div className="zone-form-actions"><span>Los permisos también se validan en la función SQL y RLS.</span><button className="btn btn-dark-green" disabled={guardando || !borrador.id_inspeccion} type="submit">{guardando ? 'Guardando…' : 'Registrar actuación'}</button></div>
    </form>}
    <section className="inspection-list-section"><h2>Historial cronológico</h2>{cargando && <p role="status">Cargando historial…</p>}{!cargando && historial.length === 0 && <p className="users-empty">Todavía no hay actuaciones registradas.</p>}
      <ol className="followup-timeline">{historial.map((item) => { const inspeccion = inspeccionesPorId.get(item.id_inspeccion); return <li key={item.id_seguimiento}><div className="followup-event-heading"><strong>{zonaPorId.get(inspeccion?.id_zona ?? -1) ?? `Inspección ${item.id_inspeccion}`}</strong><span>{new Date(item.fecha_cambio).toLocaleString('es-BO')}</span></div><span className="user-status is-active">{item.estado_nuevo}</span><p>{item.comentario}</p>{item.accion && <p><strong>Acción:</strong> {item.accion}</p>}{item.fecha_prevista && <p><strong>Fecha prevista:</strong> {item.fecha_prevista}</p>}{item.resultado && <p><strong>Resultado:</strong> {item.resultado}</p>}<small>Usuario: {item.id_usuario === idUsuario ? 'tú' : `${item.id_usuario.slice(0, 8)}…`}</small></li> })}</ol>
      {!cargando && inspecciones.length === 0 && <p className="users-footnote">Primero debe registrarse una inspección. No se han creado datos de ejemplo.</p>}
    </section>
  </section>
}

export default SeguimientoPage
