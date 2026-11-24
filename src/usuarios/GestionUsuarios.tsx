import { useEffect, useState } from 'react'
import type { PerfilUsuario, RolUsuario } from '../types/domain'
import { supabase } from '../lib/supabase'

type BorradorPerfil = {
  rol: RolUsuario
  activo: boolean
}
type ZonaAsignable = { id_zona: number; nombre: string; activa: boolean }

type GestionUsuariosProps = {
  idUsuarioActual: string
}

const roles: Array<{ valor: RolUsuario; etiqueta: string }> = [
  { valor: 'administrador', etiqueta: 'Administrador' },
  { valor: 'inspector', etiqueta: 'Inspector' },
]

function esPerfilUsuario(valor: unknown): valor is PerfilUsuario {
  if (typeof valor !== 'object' || valor === null) return false
  const perfil = valor as Record<string, unknown>
  return typeof perfil.id_usuario === 'string'
    && typeof perfil.nombre === 'string'
    && typeof perfil.correo === 'string'
    && typeof perfil.rol === 'string'
    && roles.some((rol) => rol.valor === perfil.rol)
    && typeof perfil.activo === 'boolean'
    && typeof perfil.fecha_creacion === 'string'
}

function GestionUsuarios({ idUsuarioActual }: GestionUsuariosProps) {
  const [perfiles, setPerfiles] = useState<PerfilUsuario[]>([])
  const [zonas, setZonas] = useState<ZonaAsignable[]>([])
  const [asignaciones, setAsignaciones] = useState<Record<string, number[]>>({})
  const [borradores, setBorradores] = useState<Record<string, BorradorPerfil>>({})
  const [cargando, setCargando] = useState(true)
  const [idGuardando, setIdGuardando] = useState('')
  const [correoInvitacion, setCorreoInvitacion] = useState('')
  const [invitando, setInvitando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [avisoAsignaciones, setAvisoAsignaciones] = useState('')
  const [error, setError] = useState('')
  const [recarga, setRecarga] = useState(0)

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
        const [perfilesResultado, zonasResultado] = await Promise.all([
          supabase.from('perfiles').select('id_usuario, nombre, correo, rol, activo, fecha_creacion').order('fecha_creacion', { ascending: false }),
          supabase.from('zonas').select('id_zona, nombre, activa').order('nombre'),
        ])

        if (!vigente) return
        if (perfilesResultado.error || zonasResultado.error) {
          setError('No se pudieron consultar las cuentas. Comprueba la sesión y los permisos de Administrador.')
          setPerfiles([])
          return
        }

        const resultados = Array.isArray(perfilesResultado.data) ? perfilesResultado.data.filter(esPerfilUsuario) : []
        setPerfiles(resultados)
        setZonas(Array.isArray(zonasResultado.data) ? zonasResultado.data as ZonaAsignable[] : [])
        const agrupadas: Record<string, number[]> = {}
        const asignacionesResultado = await supabase.from('zonas_inspectores').select('id_zona, id_inspector')
        if (asignacionesResultado.error) {
          setAvisoAsignaciones('Las cuentas están disponibles, pero falta aplicar la migración de asignaciones de zonas para gestionar responsabilidades.')
        } else {
          setAvisoAsignaciones('')
          for (const asignacion of asignacionesResultado.data ?? []) {
            if (typeof asignacion.id_inspector === 'string' && typeof asignacion.id_zona === 'number') {
              agrupadas[asignacion.id_inspector] = [...(agrupadas[asignacion.id_inspector] ?? []), asignacion.id_zona]
            }
          }
        }
        setAsignaciones(agrupadas)
        setBorradores(Object.fromEntries(resultados.map((perfil) => [perfil.id_usuario, {
          rol: perfil.rol,
          activo: perfil.activo,
        }])))
      } catch {
        if (vigente) setError('No se pudo conectar con Supabase para consultar las cuentas.')
      } finally {
        if (vigente) setCargando(false)
      }
    })()

    return () => {
      vigente = false
    }
  }, [recarga])

  function cambiarBorrador(idUsuario: string, cambio: Partial<BorradorPerfil>) {
    setBorradores((actuales) => ({
      ...actuales,
      [idUsuario]: { ...actuales[idUsuario]!, ...cambio },
    }))
    setMensaje('')
    setError('')
  }

  async function guardarPerfil(perfil: PerfilUsuario) {
    if (!supabase || perfil.id_usuario === idUsuarioActual) return
    const borrador = borradores[perfil.id_usuario]
    if (!borrador) return

    setIdGuardando(perfil.id_usuario)
    setMensaje('')
    setError('')

    try {
      const { data, error: errorActualizacion } = await supabase
        .from('perfiles')
        .update({ rol: borrador.rol, activo: borrador.activo })
        .eq('id_usuario', perfil.id_usuario)
        .neq('id_usuario', idUsuarioActual)
        .select('id_usuario')
        .maybeSingle()

      if (errorActualizacion || !data) {
        setError('No se pudo guardar el perfil. La política de acceso pudo rechazar el cambio.')
        return
      }

      setMensaje(`Se actualizaron los permisos de ${perfil.nombre}.`)
      setRecarga((actual) => actual + 1)
    } catch {
      setError('No se pudo conectar con Supabase para guardar el perfil.')
    } finally {
      setIdGuardando('')
    }

  }

  const cuentasPendientes = perfiles.filter((perfil) => !perfil.activo).length

  async function guardarAsignaciones(perfil: PerfilUsuario) {
    if (!supabase || perfil.rol !== 'inspector') return
    setIdGuardando(perfil.id_usuario)
    setMensaje('')
    setError('')
    try {
      const borrado = await supabase.from('zonas_inspectores').delete().eq('id_inspector', perfil.id_usuario)
      if (borrado.error) {
        setError('No se pudieron actualizar las zonas asignadas.')
        return
      }
      const filas = (asignaciones[perfil.id_usuario] ?? []).map((idZona) => ({ id_zona: idZona, id_inspector: perfil.id_usuario }))
      if (filas.length > 0) {
        const insertado = await supabase.from('zonas_inspectores').insert(filas)
        if (insertado.error) {
          setError('No se pudieron guardar todas las zonas asignadas.')
          return
        }
      }
      setMensaje(`Se actualizaron las zonas asignadas a ${perfil.nombre}.`)
    } catch {
      setError('No se pudo conectar con Supabase para actualizar las asignaciones.')
    } finally {
      setIdGuardando('')
    }
  }

  async function invitarInspector() {
    if (!supabase || !correoInvitacion.trim()) return
    setInvitando(true)
    setMensaje('')
    setError('')
    try {
      const { data, error: errorInvitacion } = await supabase.functions.invoke('invitar-inspector', {
        body: { correo: correoInvitacion.trim() },
      })
      if (errorInvitacion || !data?.mensaje) {
        setError(data?.error ?? errorInvitacion?.message ?? 'No se pudo enviar la invitación. Verifica que la Edge Function esté desplegada.')
        return
      }
      setCorreoInvitacion('')
      setMensaje(data.mensaje)
      setRecarga((actual) => actual + 1)
    } catch {
      setError('No se pudo conectar con el servicio de invitaciones.')
    } finally {
      setInvitando(false)
    }
  }

  return (
    <section className="users-panel">
      <div className="users-heading">
        <div>
          <div className="eyebrow">ADMINISTRACIÓN DE CUENTAS</div>
          <h1>Usuarios y permisos</h1>
          <p>Activa cuentas y asigna roles según las responsabilidades aprobadas.</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" disabled={cargando} onClick={() => setRecarga((actual) => actual + 1)} type="button">Actualizar lista</button>
      </div>

      <div className="users-summary" role="status">
        <strong>{cuentasPendientes}</strong>
        <span>{cuentasPendientes === 1 ? 'cuenta pendiente de aprobación' : 'cuentas pendientes de aprobación'}</span>
      </div>
      {avisoAsignaciones && <div className="access-message is-info" role="status">{avisoAsignaciones}</div>}
      <div className="inspection-form-card">
        <div className="eyebrow">NUEVO INSPECTOR</div>
        <h2>Agregar inspector</h2>
        <p>Se enviará una invitación segura por correo. La clave secreta permanece en la Edge Function de Supabase.</p>
        <div className="user-card-controls">
          <label>
            Correo electrónico
            <input className="form-control" onChange={(evento) => setCorreoInvitacion(evento.target.value)} type="email" value={correoInvitacion} />
          </label>
          <button className="btn btn-dark-green btn-sm" disabled={invitando || !correoInvitacion.trim()} onClick={() => void invitarInspector()} type="button">{invitando ? 'Enviando…' : 'Enviar invitación'}</button>
        </div>
      </div>

      {error && <div className="access-message is-error" role="alert">{error}</div>}
      {mensaje && <div className="access-message is-info" role="status">{mensaje}</div>}
      {cargando && <p className="users-empty">Cargando cuentas…</p>}
      {!cargando && !error && perfiles.length === 0 && <p className="users-empty">No hay cuentas para mostrar.</p>}

      <div className="users-list">
        {perfiles.map((perfil) => {
          const borrador = borradores[perfil.id_usuario]
          const esCuentaActual = perfil.id_usuario === idUsuarioActual
          const tieneCambios = borrador && (borrador.rol !== perfil.rol || borrador.activo !== perfil.activo)

          return (
            <article className="user-card" key={perfil.id_usuario}>
              <div className="user-card-identity">
                <div className="user-avatar" aria-hidden="true">{perfil.nombre.trim().charAt(0).toLocaleUpperCase() || '?'}</div>
                <div className="user-card-copy">
                  <h2>{perfil.nombre}</h2>
                  <p>{perfil.correo}</p>
                </div>
                <span className={`user-status ${perfil.activo ? 'is-active' : 'is-pending'}`}>
                  {perfil.activo ? 'Activa' : 'Pendiente'}
                </span>
              </div>

              <div className="user-card-controls">
                <label>
                  Rol
                  <select
                    className="form-select form-select-sm"
                    disabled={esCuentaActual || !borrador || idGuardando === perfil.id_usuario}
                    onChange={(evento) => cambiarBorrador(perfil.id_usuario, { rol: evento.target.value as RolUsuario })}
                    value={borrador?.rol ?? perfil.rol}
                  >
                    {roles.map((rol) => <option key={rol.valor} value={rol.valor}>{rol.etiqueta}</option>)}
                  </select>
                </label>
                <label className="user-active-control">
                  <input
                    checked={borrador?.activo ?? perfil.activo}
                    disabled={esCuentaActual || !borrador || idGuardando === perfil.id_usuario}
                    onChange={(evento) => cambiarBorrador(perfil.id_usuario, { activo: evento.target.checked })}
                    type="checkbox"
                  />
                  <span>Cuenta activa</span>
                </label>
                {esCuentaActual
                  ? <span className="user-self-note">Tu cuenta no se modifica desde esta pantalla.</span>
                  : (
                    <button
                      className="btn btn-dark-green btn-sm"
                      disabled={!tieneCambios || idGuardando === perfil.id_usuario}
                      onClick={() => void guardarPerfil(perfil)}
                      type="button"
                    >
                      {idGuardando === perfil.id_usuario ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  )}
              </div>
              {perfil.rol === 'inspector' && (
                <div className="user-card-controls">
                  <label>
                    Zonas asignadas
                    <select
                      className="form-select form-select-sm"
                      multiple
                      value={(asignaciones[perfil.id_usuario] ?? []).map(String)}
                      onChange={(evento) => setAsignaciones((actuales) => ({
                        ...actuales,
                        [perfil.id_usuario]: Array.from(evento.target.selectedOptions).map((opcion) => Number(opcion.value)),
                      }))}
                    >
                      {zonas.filter((zona) => zona.activa).map((zona) => <option key={zona.id_zona} value={zona.id_zona}>{zona.nombre}</option>)}
                    </select>
                  </label>
                  <button className="btn btn-outline-secondary btn-sm" disabled={idGuardando === perfil.id_usuario} onClick={() => void guardarAsignaciones(perfil)} type="button">Guardar asignaciones</button>
                </div>
              )}
            </article>
          )
        })}
      </div>
      <p className="users-footnote">Las contraseñas se gestionan exclusivamente en Supabase Auth. Esta pantalla no permite borrar cuentas ni perfiles.</p>
    </section>
  )
}

export default GestionUsuarios
