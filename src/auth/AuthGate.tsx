import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { RolUsuario } from '../types/domain'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export type PerfilActivo = {
  id_usuario: string
  nombre: string
  rol: RolUsuario
  activo: boolean
}

type EstadoPerfil =
  | { estado: 'sin-consulta' | 'cargando' | 'no-disponible' }
  | { estado: 'cargado'; perfil: PerfilActivo }

type AuthGateProps = {
  children: (perfil: PerfilActivo, cerrarSesion: () => void) => ReactNode
}

const rolesValidos: RolUsuario[] = ['administrador', 'inspector']

function esPerfilValido(valor: unknown): valor is PerfilActivo {
  if (typeof valor !== 'object' || valor === null) return false

  const perfil = valor as Record<string, unknown>
  return typeof perfil.nombre === 'string'
    && typeof perfil.activo === 'boolean'
    && typeof perfil.rol === 'string'
    && rolesValidos.includes(perfil.rol as RolUsuario)
}

function mensajeErrorAcceso(mensaje: string): string {
  if (mensaje.includes('Invalid login credentials')) return 'El correo o la contraseña no son correctos.'
  if (mensaje.includes('User already registered')) return 'Ya existe una cuenta registrada con ese correo.'
  if (mensaje.includes('Email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.'
  if (mensaje.includes('Password should')) return 'La contraseña no cumple los requisitos configurados en Supabase.'
  return 'No se pudo completar el acceso. Revisa los datos e inténtalo de nuevo.'
}

function nombreRol(rol: RolUsuario): string {
  if (rol === 'administrador') return 'Administrador'
  if (rol === 'inspector') return 'Inspector'
  return 'Inspector'
}

function AuthGate({ children }: AuthGateProps) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [errorSesion, setErrorSesion] = useState('')
  const [estadoPerfil, setEstadoPerfil] = useState<EstadoPerfil>({ estado: 'sin-consulta' })
  const [intentoPerfil, setIntentoPerfil] = useState(0)

  useEffect(() => {
    if (!supabase) {
      setCargandoSesion(false)
      return
    }

    let vigente = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      if (!vigente) return
      setUsuario(sesion?.user ?? null)
      setErrorSesion('')
      setCargandoSesion(false)
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!vigente) return
      setUsuario(data.session?.user ?? null)
      setErrorSesion(error ? 'No se pudo comprobar la sesión. Actualiza la página e inténtalo de nuevo.' : '')
      setCargandoSesion(false)
    })

    return () => {
      vigente = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !usuario) {
      setEstadoPerfil({ estado: 'sin-consulta' })
      return
    }

    let vigente = true
    setEstadoPerfil({ estado: 'cargando' })

    void supabase
      .from('perfiles')
    .select('id_usuario, nombre, rol, activo')
      .eq('id_usuario', usuario.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vigente) return
        if (error || !esPerfilValido(data)) {
          setEstadoPerfil({ estado: 'no-disponible' })
          return
        }
        setEstadoPerfil({ estado: 'cargado', perfil: data })
      })

    return () => {
      vigente = false
    }
  }, [usuario, intentoPerfil])

  async function cerrarSesion() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setErrorSesion('No se pudo cerrar la sesión. Inténtalo de nuevo.')
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <EstadoAcceso
        titulo="Falta configurar Supabase"
        detalle="Completa la URL del proyecto y la clave publishable en .env.local, y reinicia el servidor de desarrollo."
      />
    )
  }

  if (cargandoSesion) {
    return <EstadoAcceso titulo="Comprobando el acceso" detalle="Estamos verificando la sesión con Supabase." />
  }

  if (!usuario) {
    return <FormularioAcceso errorSesion={errorSesion} />
  }

  if (estadoPerfil.estado !== 'cargado') {
    if (estadoPerfil.estado === 'no-disponible') {
      return (
        <EstadoAcceso
          titulo="No se pudo verificar el perfil"
          detalle="No se mostrarán datos hasta poder leer tu perfil. Comprueba que la migración esté aplicada y que tu cuenta tenga un perfil activo."
          accion={<button className="btn btn-outline-secondary" onClick={() => setIntentoPerfil((intento) => intento + 1)} type="button">Reintentar</button>}
          cerrarSesion={cerrarSesion}
        />
      )
    }

    return <EstadoAcceso titulo="Verificando el perfil" detalle="La información protegida se mostrará después de comprobar tu cuenta." />
  }

  if (!estadoPerfil.perfil.activo) {
    return (
      <EstadoAcceso
        titulo="Cuenta pendiente de aprobación"
        detalle="El Administrador debe activar tu perfil antes de que puedas consultar información del sistema."
        cerrarSesion={cerrarSesion}
      />
    )
  }

  return children(estadoPerfil.perfil, cerrarSesion)
}

type EstadoAccesoProps = {
  titulo: string
  detalle: string
  accion?: ReactNode
  cerrarSesion?: () => void
}

function EstadoAcceso({ titulo, detalle, accion, cerrarSesion }: EstadoAccesoProps) {
  return (
    <main className="access-page">
      <section className="access-card" aria-live="polite">
        <div className="access-brand">
          <img src="/favicon.svg" alt="" className="brand-mark" />
          <div>
            <strong>La Paz Segura</strong>
            <span>Prototipo académico</span>
          </div>
        </div>
        <div className="eyebrow">CONTROL DE ACCESO</div>
        <h1>{titulo}</h1>
        <p>{detalle}</p>
        <div className="access-actions">
          {accion}
          {cerrarSesion && <button className="btn btn-outline-secondary" onClick={cerrarSesion} type="button">Cerrar sesión</button>}
        </div>
        <small>No es un sistema oficial de la Alcaldía.</small>
      </section>
    </main>
  )
}

type FormularioAccesoProps = {
  errorSesion: string
}

function FormularioAcceso({ errorSesion }: FormularioAccesoProps) {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviarFormulario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!supabase) return

    setEnviando(true)
    setError('')
    setMensaje('')

    try {
      const { error: errorInicio } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: contrasena })
      if (errorInicio) setError(mensajeErrorAcceso(errorInicio.message))
    } catch {
      setError('No se pudo conectar con Supabase. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="access-page">
      <section className="access-card">
        <div className="access-brand">
          <img src="/favicon.svg" alt="" className="brand-mark" />
          <div>
            <strong>La Paz Segura</strong>
            <span>Inspección preventiva · prototipo académico</span>
          </div>
        </div>

        <div className="eyebrow">ACCESO AL SISTEMA</div>
        <h1>Iniciar sesión</h1>
        <p className="access-intro">Ingresa con la cuenta invitada y aprobada por el Administrador.</p>

        <form className="access-form" onSubmit={enviarFormulario}>
          <label>
            Correo electrónico
            <input autoComplete="email" className="form-control" onChange={(evento) => setCorreo(evento.target.value)} required type="email" value={correo} />
          </label>
          <label>
            Contraseña
            <input autoComplete="current-password" className="form-control" onChange={(evento) => setContrasena(evento.target.value)} required type="password" value={contrasena} />
          </label>

          {(error || errorSesion) && <div className="access-message is-error" role="alert">{error || errorSesion}</div>}
          {mensaje && <div className="access-message is-info" role="status">{mensaje}</div>}

          <button className="btn btn-dark-green access-submit" disabled={enviando} type="submit">
            {enviando ? 'Procesando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="access-intro">Los inspectores reciben una invitación por correo. No hay registro público.</p>
        <small>No es un sistema oficial de la Alcaldía.</small>
      </section>
    </main>
  )
}

export default AuthGate
export { nombreRol }
