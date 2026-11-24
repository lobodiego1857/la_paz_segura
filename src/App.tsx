import { lazy, Suspense, useEffect, useState } from 'react'
import AuthGate, { nombreRol, type PerfilActivo } from './auth/AuthGate'
import { supabase } from './lib/supabase'
import GestionUsuarios from './usuarios/GestionUsuarios'

const ZonasPage = lazy(() => import('./zonas/ZonasPage'))
const InspeccionesPage = lazy(() => import('./inspecciones/InspeccionesPage'))
const SeguimientoPage = lazy(() => import('./seguimiento/SeguimientoPage'))
const ResumenPage = lazy(() => import('./resumen/ResumenPage'))
const ConsultaPublica = lazy(() => import('./consulta/ConsultaPublica'))

type SectionId = 'inicio' | 'zonas' | 'inspecciones' | 'seguimiento' | 'usuarios' | 'informes'

const sections: Array<{ id: SectionId; label: string; symbol: string; description: string }> = [
  { id: 'inicio', label: 'Inicio', symbol: '⌂', description: 'Resumen del estado del proyecto.' },
  { id: 'zonas', label: 'Zonas y mapa', symbol: '⌖', description: 'Registro y ubicación geográfica de zonas seleccionadas.' },
  { id: 'inspecciones', label: 'Inspecciones', symbol: '▤', description: 'Observaciones, prioridad operativa y fotografías.' },
  { id: 'seguimiento', label: 'Seguimiento e historial', symbol: '↻', description: 'Acciones, estados, comentarios y trazabilidad cronológica.' },
  { id: 'usuarios', label: 'Usuarios y permisos', symbol: '♙', description: 'Aprobación de cuentas, roles y activación de perfiles.' },
  { id: 'informes', label: 'Panel e informes', symbol: '▥', description: 'Totales sencillos, filtros y exportación CSV opcional.' },
]

function PanelInicial({ perfil, cerrarSesion }: { perfil: PerfilActivo; cerrarSesion: () => void }) {
  const [activeSection, setActiveSection] = useState<SectionId>('inicio')
  const [visitedSections, setVisitedSections] = useState<Set<SectionId>>(() => new Set(['inicio']))
  const active = sections.find((section) => section.id === activeSection) ?? sections[0]!

  function navegarA(section: SectionId) {
    setActiveSection(section)
    setVisitedSections((visitadas) => {
      if (visitadas.has(section)) return visitadas
      return new Set(visitadas).add(section)
    })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <img src="/favicon.svg" alt="" className="brand-mark" />
          <div>
            <div className="brand-name">La Paz Segura</div>
            <div className="brand-caption">Inspección preventiva</div>
          </div>
        </div>

        <div className="sidebar-label">SISTEMA</div>
        <nav className="side-nav" aria-label="Navegación principal">
          {sections.filter((section) => section.id !== 'usuarios' || perfil.rol === 'administrador').map((section) => (
            <button
              className={`side-nav-item ${activeSection === section.id ? 'is-active' : ''}`}
              key={section.id}
              onClick={() => navegarA(section.id)}
              type="button"
            >
              <span className="nav-symbol" aria-hidden="true">{section.symbol}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footnote">
          <span className="status-dot" />
          <div>
            <div className="footnote-title">Entorno de desarrollo</div>
            <div className="footnote-subtitle">Uso académico · datos ficticios</div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="eyebrow">PROYECTO ACADÉMICO</div>
            <div className="topbar-context">Registro georreferenciado y seguimiento</div>
          </div>
          <span className="phase-pill"><span className="phase-dot" /> Desarrollo y validación</span>
          <div className="topbar-account">
            <span className="account-label">{perfil.nombre} · {nombreRol(perfil.rol)}</span>
            <button className="btn btn-outline-secondary btn-sm" onClick={cerrarSesion} type="button">Cerrar sesión</button>
          </div>
        </header>

        <div className="page-content">
          <div hidden={activeSection !== 'inicio'}>
            {visitedSections.has('inicio') && (
              <>
                <section className="welcome-block">
                  <div className="welcome-copy">
                    <div className="eyebrow welcome-eyebrow">BIENVENIDO AL PROYECTO</div>
                    <h1>Información ordenada.<br /><span>Seguimiento claro.</span></h1>
                    <p>Una herramienta para registrar zonas seleccionadas, documentar inspecciones preventivas y conservar el historial de cada actuación.</p>
                    <div className="welcome-meta">
                      <span>La Paz, Bolivia</span><span className="meta-separator">·</span><span>Entrega prevista: 10 nov 2026</span>
                    </div>
                  </div>
                  <div className="welcome-art" aria-hidden="true">
                    <div className="art-sun" />
                    <div className="art-hill art-hill-back" />
                    <div className="art-hill art-hill-front" />
                    <div className="art-pin"><span /></div>
                    <div className="art-route art-route-one" />
                    <div className="art-route art-route-two" />
                  </div>
                </section>

                <Suspense fallback={<p className="users-empty" role="status">Cargando el resumen…</p>}>
                  <ResumenPage />
                </Suspense>
              </>
            )}
          </div>

          <div hidden={activeSection !== 'zonas'}>
            {visitedSections.has('zonas') && (
              <Suspense fallback={<p className="users-empty" role="status">Cargando el mapa de zonas…</p>}>
                <ZonasPage rol={perfil.rol} />
              </Suspense>
            )}
          </div>

          <div hidden={activeSection !== 'inspecciones'}>
            {visitedSections.has('inspecciones') && (
              <Suspense fallback={<p className="users-empty" role="status">Cargando inspecciones…</p>}>
                <InspeccionesPage idUsuario={perfil.id_usuario} rol={perfil.rol} />
              </Suspense>
            )}
          </div>

          <div hidden={activeSection !== 'seguimiento'}>
            {visitedSections.has('seguimiento') && (
              <Suspense fallback={<p className="users-empty" role="status">Cargando historial…</p>}>
                <SeguimientoPage idUsuario={perfil.id_usuario} rol={perfil.rol} />
              </Suspense>
            )}
          </div>

          <div hidden={activeSection !== 'informes'}>
            {visitedSections.has('informes') && (
              <Suspense fallback={<p className="users-empty" role="status">Cargando informes…</p>}>
                <InspeccionesPage idUsuario={perfil.id_usuario} rol={perfil.rol} modoInforme />
              </Suspense>
            )}
          </div>

          {perfil.rol === 'administrador' && (
            <div hidden={activeSection !== 'usuarios'}>
              {visitedSections.has('usuarios') && <GestionUsuarios idUsuarioActual={perfil.id_usuario} />}
            </div>
          )}

          {activeSection === 'usuarios' && perfil.rol !== 'administrador' && (
            <section className="module-placeholder">
              <div className="placeholder-icon">{active.symbol}</div>
              <div className="eyebrow">MÓDULO {String(sections.findIndex((s) => s.id === activeSection)).padStart(2, '0')}</div>
              <h1>{active.label}</h1>
              <p>{active.description}</p>
              <div className="setup-alert">
                <div className="setup-alert-icon">i</div>
                <div>
                  <strong>Sección no disponible</strong>
                  <p>La sección solicitada no está disponible en esta versión del prototipo.</p>
                </div>
              </div>
              <button className="btn btn-dark-green mt-3" onClick={() => navegarA('inicio')} type="button">Volver al resumen</button>
            </section>
          )}

          <footer className="app-footer">
            <span>LA PAZ SEGURA <span className="footer-dot">·</span> Versión inicial 0.1.0</span>
            <span>Prototipo académico · No es un sistema oficial de la Alcaldía</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

function App() {
  const [consultaPublica, setConsultaPublica] = useState<boolean | null>(null)
  const [accesoPersonalVisitado, setAccesoPersonalVisitado] = useState(false)
  const [errorAcceso, setErrorAcceso] = useState('')

  useEffect(() => {
    let vigente = true

    async function restaurarVista() {
      let vistaGuardada: string | null = null
      try {
        vistaGuardada = window.sessionStorage.getItem('la-paz-segura-vista')
      } catch {
        if (vigente) setErrorAcceso('No se pudo recordar la vista anterior en esta pestaña.')
      }

      if (!vigente) return
      if (vistaGuardada === 'publica') {
        setConsultaPublica(true)
        return
      }
      if (vistaGuardada === 'personal') {
        setConsultaPublica(false)
        setAccesoPersonalVisitado(true)
        return
      }

      if (!supabase) {
        setConsultaPublica(true)
        return
      }

      let sesionActiva: boolean
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          if (!vigente) return
          setErrorAcceso('No se pudo comprobar la sesión. Intenta acceder nuevamente.')
          setConsultaPublica(true)
          return
        }
        sesionActiva = Boolean(data.session)
      } catch {
        if (!vigente) return
        setErrorAcceso('No se pudo comprobar la sesión. Intenta acceder nuevamente.')
        setConsultaPublica(true)
        return
      }

      if (!vigente) return

      setConsultaPublica(!sesionActiva)
      setAccesoPersonalVisitado(sesionActiva)
    }

    void restaurarVista()
    return () => { vigente = false }
  }, [])

  function guardarVista(vista: 'publica' | 'personal') {
    try {
      window.sessionStorage.setItem('la-paz-segura-vista', vista)
    } catch {
      setErrorAcceso('No se pudo recordar la vista seleccionada en esta pestaña.')
    }
  }

  async function accederAlSistema() {
    setErrorAcceso('')

    if (supabase) {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          setErrorAcceso('No se pudo cerrar la sesión anterior. Inténtalo de nuevo.')
          return
        }
      } catch {
        setErrorAcceso('No se pudo cerrar la sesión anterior. Inténtalo de nuevo.')
        return
      }
    }

    guardarVista('personal')
    setConsultaPublica(false)
    setAccesoPersonalVisitado(true)
  }

  if (consultaPublica === null) {
    return <p className="users-empty" role="status">Comprobando la sesión…</p>
  }

  return (
    <>
      <div hidden={!consultaPublica}>
        {errorAcceso && <div className="access-message is-error" role="alert">{errorAcceso}</div>}
        <Suspense fallback={<p className="users-empty" role="status">Cargando consulta pública…</p>}>
          <ConsultaPublica onAccesoPersonal={() => {
            void accederAlSistema()
          }} visible={consultaPublica} />
        </Suspense>
      </div>

      {accesoPersonalVisitado && (
        <div hidden={consultaPublica}>
          {errorAcceso && <div className="access-message is-error" role="alert">{errorAcceso}</div>}
          <button className="staff-public-return" onClick={() => {
            guardarVista('publica')
            setConsultaPublica(true)
          }} type="button">Ver consulta pública</button>
          <AuthGate>
            {(perfil, cerrarSesion) => <PanelInicial perfil={perfil} cerrarSesion={cerrarSesion} />}
          </AuthGate>
        </div>
      )}
    </>
  )
}

export default App
