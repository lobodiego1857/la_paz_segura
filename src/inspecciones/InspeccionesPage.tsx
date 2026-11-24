import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, useRef } from 'react'
import type { EstadoSeguimiento, Inspeccion, NivelAtencion, RolUsuario, Zona } from '../types/domain'
import { supabase } from '../lib/supabase'
import { comprimirFotografia, TAMANO_MAXIMO_STORAGE, TIPOS_PERMITIDOS } from '../lib/image-compression'

type Fotografia = {
  id_fotografia: number
  id_inspeccion: number
  ruta_archivo: string
  descripcion: string | null
  fecha_carga: string
  url_firmada: string | null
}

type InspeccionVista = Inspeccion & {
  fotografias: Fotografia[]
}

type InspeccionesPageProps = {
  idUsuario: string
  rol: RolUsuario
  modoInforme?: boolean
}

type BorradorInspeccion = {
  id_zona: string
  fecha_inspeccion: string
  observaciones: string
  nivel_atencion: NivelAtencion | ''
  recomendaciones: string
}

type ResultadoCarga = {
  cargadas: number
  fallidas: number
}

const niveles: NivelAtencion[] = ['Baja', 'Media', 'Alta']
const estados: EstadoSeguimiento[] = ['Pendiente', 'En seguimiento', 'Cerrada']

function fechaLocalHoy(): string {
  const fecha = new Date()
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset())
  return fecha.toISOString().slice(0, 10)
}

const borradorVacio: BorradorInspeccion = {
  id_zona: '',
  fecha_inspeccion: fechaLocalHoy(),
  observaciones: '',
  nivel_atencion: '',
  recomendaciones: '',
}

function esZona(valor: unknown): valor is Zona {
  if (typeof valor !== 'object' || valor === null) return false
  const zona = valor as Record<string, unknown>
  return typeof zona.id_zona === 'number'
    && typeof zona.nombre === 'string'
    && typeof zona.activa === 'boolean'
    && typeof zona.fecha_registro === 'string'
    && typeof zona.id_tipo_riesgo === 'number'
    && typeof zona.latitud === 'number'
    && typeof zona.longitud === 'number'
}

function esInspeccion(valor: unknown): valor is Inspeccion {
  if (typeof valor !== 'object' || valor === null) return false
  const inspeccion = valor as Record<string, unknown>
  return typeof inspeccion.id_inspeccion === 'number'
    && typeof inspeccion.id_zona === 'number'
    && typeof inspeccion.id_usuario === 'string'
    && typeof inspeccion.fecha_inspeccion === 'string'
    && typeof inspeccion.observaciones === 'string'
    && typeof inspeccion.nivel_atencion === 'string'
    && niveles.includes(inspeccion.nivel_atencion as NivelAtencion)
    && (inspeccion.recomendaciones === null || typeof inspeccion.recomendaciones === 'string')
    && typeof inspeccion.estado === 'string'
    && estados.includes(inspeccion.estado as EstadoSeguimiento)
    && typeof inspeccion.fecha_actualizacion === 'string'
}

function esFotografia(valor: unknown): valor is Fotografia {
  if (typeof valor !== 'object' || valor === null) return false
  const foto = valor as Record<string, unknown>
  return typeof foto.id_fotografia === 'number'
    && typeof foto.id_inspeccion === 'number'
    && typeof foto.ruta_archivo === 'string'
    && (foto.descripcion === null || typeof foto.descripcion === 'string')
    && typeof foto.fecha_carga === 'string'
}

function textoTamano(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KB`
}

function extensionesPermitidas(): string {
  return '.jpg,.jpeg,.png,.webp'
}

function tipoArchivoPermitido(archivo: File): boolean {
  return TIPOS_PERMITIDOS.includes(archivo.type)
}

function extensionFotografia(tipo: string): string {
  if (tipo === 'image/jpeg') return 'jpg'
  if (tipo === 'image/png') return 'png'
  return 'webp'
}

function celdaCsv(valor: string | number | null): string {
  let texto = valor === null ? '' : String(valor)
  if (/^[\s]*[=+\-@\t\r]/.test(texto)) texto = `'${texto}`
  return `"${texto.replaceAll('"', '""')}"`
}

async function cargarFotografias(idInspeccion: number, archivos: File[]): Promise<ResultadoCarga> {
  if (!supabase) return { cargadas: 0, fallidas: archivos.length }
  let cargadas = 0
  let fallidas = 0

  for (const archivo of archivos) {
    try {
      const ruta = `inspecciones/${idInspeccion}/${crypto.randomUUID()}.${extensionFotografia(archivo.type)}`
      const { error: errorArchivo } = await supabase.storage.from('evidencias').upload(ruta, archivo, {
        cacheControl: '3600',
        contentType: archivo.type,
        upsert: false,
      })

      if (errorArchivo) {
        fallidas += 1
        continue
      }

      const { error: errorRegistro } = await supabase.from('fotografias').insert({
        id_inspeccion: idInspeccion,
        ruta_archivo: ruta,
      })
      if (errorRegistro) fallidas += 1
      else cargadas += 1
    } catch {
      fallidas += 1
    }
  }

  return { cargadas, fallidas }
}

function InspeccionesPage({ idUsuario, rol, modoInforme = false }: InspeccionesPageProps) {
  const [zonas, setZonas] = useState<Zona[]>([])
  const [tiposRiesgo, setTiposRiesgo] = useState<Array<{ id_tipo_riesgo: number; nombre: string }>>([])
  const [inspecciones, setInspecciones] = useState<InspeccionVista[]>([])
  const [borrador, setBorrador] = useState<BorradorInspeccion>(borradorVacio)
  const [fotografiasNuevas, setFotografiasNuevas] = useState<File[]>([])
  const [cargando, setCargando] = useState(true)
  const [comprimiendo, setComprimiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [recarga, setRecarga] = useState(0)
  const [filtro, setFiltro] = useState({ zona: '', categoria: '', estado: '', desde: '', hasta: '' })
  const [mostrarInforme, setMostrarInforme] = useState(modoInforme)

  const puedeRegistrar = rol === 'inspector'
  const nombreZona = useMemo(() => new Map(zonas.map((zona) => [zona.id_zona, zona.nombre])), [zonas])
  const zonasActivas = useMemo(() => zonas.filter((zona) => zona.activa), [zonas])
  const zonaPorId = useMemo(() => new Map(zonas.map((zona) => [zona.id_zona, zona])), [zonas])
  const nombreTipo = useMemo(() => new Map(tiposRiesgo.map((tipo) => [tipo.id_tipo_riesgo, tipo.nombre])), [tiposRiesgo])
  const inspeccionesFiltradas = useMemo(() => inspecciones.filter((inspeccion) => {
    const zona = zonaPorId.get(inspeccion.id_zona)
    return (!filtro.zona || String(inspeccion.id_zona) === filtro.zona)
      && (!filtro.categoria || String(zona?.id_tipo_riesgo ?? '') === filtro.categoria)
      && (!filtro.estado || inspeccion.estado === filtro.estado)
      && (!filtro.desde || inspeccion.fecha_inspeccion >= filtro.desde)
      && (!filtro.hasta || inspeccion.fecha_inspeccion <= filtro.hasta)
  }), [inspecciones, zonaPorId, filtro])
  const espacioDisponible = Math.max(0, 5 - fotografiasNuevas.length)

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
        const [resultadoZonas, resultadoInspecciones, resultadoTipos] = await Promise.all([
          supabase
            .from('zonas')
            .select('id_zona, nombre, direccion, referencia, id_tipo_riesgo, latitud, longitud, descripcion, activa, fecha_registro')
            .order('nombre'),
          supabase
            .from('inspecciones')
            .select('id_inspeccion, id_zona, id_usuario, fecha_inspeccion, observaciones, nivel_atencion, recomendaciones, estado, fecha_actualizacion')
            .order('fecha_inspeccion', { ascending: false }),
          supabase.from('tipos_riesgo').select('id_tipo_riesgo, nombre').order('nombre'),
        ])

        if (!vigente) return
        if (resultadoZonas.error || resultadoInspecciones.error || resultadoTipos.error) {
          setError('No se pudieron consultar las zonas o inspecciones. Comprueba la sesión y los permisos de lectura.')
          return
        }

        const zonasCargadas = Array.isArray(resultadoZonas.data) ? resultadoZonas.data.filter(esZona) : []
        const inspeccionesCargadas = Array.isArray(resultadoInspecciones.data) ? resultadoInspecciones.data.filter(esInspeccion) : []
        const idsInspeccion = inspeccionesCargadas.map((inspeccion) => inspeccion.id_inspeccion)
        setZonas(zonasCargadas)
        setTiposRiesgo(Array.isArray(resultadoTipos.data) ? resultadoTipos.data as Array<{ id_tipo_riesgo: number; nombre: string }> : [])

        if (idsInspeccion.length === 0) {
          setInspecciones([])
          return
        }

        const { data: datosFotos, error: errorFotos } = await supabase
          .from('fotografias')
          .select('id_fotografia, id_inspeccion, ruta_archivo, descripcion, fecha_carga')
          .in('id_inspeccion', idsInspeccion)

        if (!vigente) return
        const fotos = !errorFotos && Array.isArray(datosFotos) ? datosFotos.filter(esFotografia) : []
        const urlsFirmadas = fotos.length > 0
          ? await supabase.storage.from('evidencias').createSignedUrls(fotos.map((foto) => foto.ruta_archivo), 3600)
          : { data: [], error: null }
        if (!vigente) return

        const urlPorRuta = new Map((urlsFirmadas.data ?? []).flatMap((resultado) => (
          resultado.path && resultado.signedUrl ? [[resultado.path, resultado.signedUrl] as const] : []
        )))
        const fotosConUrl = fotos.map((foto) => ({
          ...foto,
          url_firmada: urlPorRuta.get(foto.ruta_archivo) ?? null,
        }))

        setInspecciones(inspeccionesCargadas.map((inspeccion) => ({
          ...inspeccion,
          fotografias: fotosConUrl.filter((foto) => foto.id_inspeccion === inspeccion.id_inspeccion),
        })))
        if (errorFotos || urlsFirmadas.error) setMensaje('Algunas fotografías no están disponibles para visualizarse en este momento.')
      } catch {
        if (vigente) setError('No se pudo conectar con Supabase para cargar las inspecciones.')
      } finally {
        if (vigente) setCargando(false)
      }
    })()

    return () => {
      vigente = false
    }
  }, [recarga])

  function cambiarCampo(campo: keyof BorradorInspeccion, valor: string) {
    setBorrador((actual) => ({ ...actual, [campo]: valor }))
    setError('')
    setMensaje('')
  }

  async function seleccionarFotografias(evento: ChangeEvent<HTMLInputElement>) {
    const seleccionadas = Array.from(evento.target.files ?? [])
    evento.target.value = ''
    if (seleccionadas.length === 0) return
    if (seleccionadas.length > espacioDisponible) {
      setError(`Puedes adjuntar hasta cinco fotografías; quedan ${espacioDisponible} espacios.`)
      return
    }

    setComprimiendo(true)
    setError('')
    setMensaje('')
    const comprimidas: File[] = []
    for (const archivo of seleccionadas) {
      if (!tipoArchivoPermitido(archivo)) {
        setError('Se rechazó un archivo. Solo se permiten imágenes JPG, PNG o WebP.')
        continue
      }
      try {
        const comprimida = await comprimirFotografia(archivo)
        if (comprimida.size > TAMANO_MAXIMO_STORAGE) {
          setError('Se rechazó una imagen que supera el límite de 1 MB tras comprimirla.')
          continue
        }
        comprimidas.push(comprimida)
      } catch (errorCompresion) {
        setError(errorCompresion instanceof Error ? errorCompresion.message : 'No se pudo comprimir una imagen.')
      }
    }
    setFotografiasNuevas((actuales) => [...actuales, ...comprimidas].slice(0, 5))
    setComprimiendo(false)
  }

  async function guardarInspeccion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!supabase || !puedeRegistrar || zonasActivas.length === 0 || !borrador.nivel_atencion || comprimiendo) return

    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const { data, error: errorInspeccion } = await supabase
        .from('inspecciones')
        .insert({
          id_zona: Number(borrador.id_zona),
          id_usuario: idUsuario,
          fecha_inspeccion: borrador.fecha_inspeccion,
          observaciones: borrador.observaciones.trim(),
          nivel_atencion: borrador.nivel_atencion,
          recomendaciones: borrador.recomendaciones.trim() || null,
        })
        .select('id_inspeccion')
        .single()

      if (errorInspeccion || !data) {
        setError('No se pudo guardar la inspección. Revisa los datos y el permiso asignado a tu rol.')
        return
      }

      const idInspeccion = data.id_inspeccion as number
      let resultadoFotos: ResultadoCarga = { cargadas: 0, fallidas: 0 }
      if (fotografiasNuevas.length > 0) {
        resultadoFotos = await cargarFotografias(idInspeccion, fotografiasNuevas)
      }

      setBorrador(borradorVacio)
      setFotografiasNuevas([])
      setRecarga((actual) => actual + 1)
      if (resultadoFotos.fallidas > 0) {
        setError(`La inspección se guardó. ${resultadoFotos.fallidas} fotografía(s) no se cargaron ni se asociaron; puedes reintentarlas desde la inspección.`)
      } else {
        setMensaje(`Inspección registrada${resultadoFotos.cargadas > 0 ? ` con ${resultadoFotos.cargadas} fotografía(s)` : ''}. El estado inicial es Pendiente y su registro de historial se genera en la base de datos.`)
      }
    } catch {
      setError('No se pudo completar el registro. Comprueba la conexión e inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  function quitarFotografia(indice: number) {
    setFotografiasNuevas((actuales) => actuales.filter((_archivo, posicion) => posicion !== indice))
  }

  async function adjuntarFotografias(inspeccion: InspeccionVista, seleccionadas: File[]) {
    const restantes = Math.max(0, 5 - inspeccion.fotografias.length)
    if (seleccionadas.length > restantes) {
      setError(`Esta inspección admite hasta cinco fotografías; quedan ${restantes} espacios.`)
      return
    }

    setError('')
    setMensaje('')
    const comprimidas: File[] = []
    for (const archivo of seleccionadas) {
      if (!tipoArchivoPermitido(archivo)) {
        setError('Solo se permiten imágenes JPG, PNG o WebP.')
        continue
      }
      try {
        const comprimida = await comprimirFotografia(archivo)
        if (comprimida.size > TAMANO_MAXIMO_STORAGE) {
          setError('Se rechazó una imagen que supera el límite de 1 MB tras comprimirla.')
          continue
        }
        comprimidas.push(comprimida)
      } catch (errorCompresion) {
        setError(errorCompresion instanceof Error ? errorCompresion.message : 'No se pudo comprimir una imagen.')
      }
    }

    if (comprimidas.length === 0) return
    const resultado = await cargarFotografias(inspeccion.id_inspeccion, comprimidas)
    setRecarga((actual) => actual + 1)
    if (resultado.fallidas > 0) {
      setError(`${resultado.fallidas} fotografía(s) no se cargaron ni se asociaron. No se creó una referencia para esos archivos.`)
    } else {
      setMensaje(`Se adjuntaron ${resultado.cargadas} fotografía(s) a la inspección.`)
    }
  }

  function exportarCsv() {
    const filas: Array<Array<string | number | null>> = [
      ['Zona', 'Categoría', 'Fecha de inspección', 'Prioridad operativa', 'Estado', 'Observaciones', 'Recomendaciones'],
      ...inspeccionesFiltradas.map((inspeccion) => [
        nombreZona.get(inspeccion.id_zona) ?? `Zona ${inspeccion.id_zona}`,
        nombreTipo.get(zonaPorId.get(inspeccion.id_zona)?.id_tipo_riesgo ?? -1) ?? '',
        inspeccion.fecha_inspeccion,
        inspeccion.nivel_atencion,
        inspeccion.estado,
        inspeccion.observaciones,
        inspeccion.recomendaciones,
      ]),
    ]
    const contenido = `\uFEFFsep=;\r\n${filas.map((fila) => fila.map(celdaCsv).join(';')).join('\r\n')}`
    const archivo = new Blob([contenido], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(archivo)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `inspecciones-${fechaLocalHoy()}.csv`
    enlace.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  function imprimirInforme() {
    const tituloAnterior = document.title
    document.title = `Informe-La-Paz-Segura-${fechaLocalHoy()}`
    window.print()
    document.title = tituloAnterior
  }

  return (
    <section className="inspections-page">
      <div className="inspections-heading">
        <div>
          <div className="eyebrow">{modoInforme ? 'CONSULTA E INFORMES' : 'INSPECCIONES Y EVIDENCIAS'}</div>
          <h1>{modoInforme ? 'Informe de inspecciones' : 'Inspecciones preventivas'}</h1>
          <p>Registros de observación y prioridad operativa. No constituyen diagnósticos profesionales.</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" disabled={cargando} onClick={() => setRecarga((actual) => actual + 1)} type="button">Actualizar</button>
      </div>

      {error && <div className="access-message is-error" role="alert">{error}</div>}
      {mensaje && <div className="access-message is-info" role="status">{mensaje}</div>}

      <section className="inspection-summary" aria-label="Resumen de inspecciones">
        <article><strong>{inspecciones.length}</strong><span>Total</span></article>
        {estados.map((estado) => <article key={estado}><strong>{inspecciones.filter((i) => i.estado === estado).length}</strong><span>{estado}</span></article>)}
      </section>

      {puedeRegistrar && !modoInforme && (
        <form className="inspection-form-card" onSubmit={guardarInspeccion}>
          <div className="zone-form-heading">
            <div>
              <div className="eyebrow">NUEVO REGISTRO</div>
              <h2>Registrar inspección</h2>
            </div>
          </div>

          {zonasActivas.length === 0 && !cargando && <p className="access-message is-info">Primero debe existir una zona activa. No se cargan zonas de ejemplo.</p>}
          <div className="inspection-form-grid">
            <label className="zone-field">
              Zona
              <select className="form-select" onChange={(evento) => cambiarCampo('id_zona', evento.target.value)} required value={borrador.id_zona}>
                <option value="">Selecciona una zona activa</option>
                {zonasActivas.map((zona) => <option key={zona.id_zona} value={zona.id_zona}>{zona.nombre}</option>)}
              </select>
            </label>
            <label className="zone-field">
              Fecha de inspección
              <input className="form-control" max={fechaLocalHoy()} onChange={(evento) => cambiarCampo('fecha_inspeccion', evento.target.value)} required type="date" value={borrador.fecha_inspeccion} />
            </label>
            <label className="zone-field">
              Prioridad operativa
              <select className="form-select" onChange={(evento) => cambiarCampo('nivel_atencion', evento.target.value)} required value={borrador.nivel_atencion}>
                <option value="">Selecciona prioridad</option>
                {niveles.map((nivel) => <option key={nivel} value={nivel}>{nivel}</option>)}
              </select>
              <small>No es un diagnóstico técnico.</small>
            </label>
            <label className="zone-field inspection-field-wide">
              Observaciones
              <textarea className="form-control" maxLength={10000} minLength={1} onChange={(evento) => cambiarCampo('observaciones', evento.target.value)} required rows={4} value={borrador.observaciones} />
            </label>
            <label className="zone-field inspection-field-wide">
              Recomendaciones
              <textarea className="form-control" maxLength={4000} onChange={(evento) => cambiarCampo('recomendaciones', evento.target.value)} rows={3} value={borrador.recomendaciones} />
            </label>
            <div className="zone-field inspection-field-wide">
              <label htmlFor="inspection-photos">Fotografías (hasta 5, JPG/PNG/WebP)</label>
              <input accept={extensionesPermitidas()} className="form-control" disabled={fotografiasNuevas.length >= 5 || comprimiendo} id="inspection-photos" multiple onChange={(evento) => void seleccionarFotografias(evento)} type="file" />
              <small>Las imágenes se validan y comprimen en este dispositivo hasta un máximo de 1 MB cada una. Quedan {espacioDisponible} espacios.</small>
              {comprimiendo && <small role="status">Comprimiendo fotografías…</small>}
              {fotografiasNuevas.length > 0 && (
                <ul className="selected-photos">
                  {fotografiasNuevas.map((archivo, indice) => (
                    <li key={`${archivo.name}-${indice}`}>
                      <span>{archivo.name} · {textoTamano(archivo.size)}</span>
                      <button className="btn btn-link btn-sm" onClick={() => quitarFotografia(indice)} type="button">Quitar</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="zone-form-actions">
            <span>El estado comienza como Pendiente. El historial inicial se registra junto a la inspección en la base de datos.</span>
            <button className="btn btn-dark-green" disabled={guardando || comprimiendo || zonasActivas.length === 0} type="submit">{guardando ? 'Guardando…' : 'Registrar inspección'}</button>
          </div>
        </form>
      )}

      <section className="inspection-list-section">
        <div className="zone-section-heading">
          <div>
            <h2>{modoInforme ? 'Informe consultado' : 'Registro de inspecciones'}</h2>
            <p>{cargando ? 'Cargando registros…' : `${inspeccionesFiltradas.length} de ${inspecciones.length} inspecciones`}</p>
          </div>
          <div className="inspection-report-actions">
            {!modoInforme && <button className="btn btn-outline-secondary btn-sm" disabled={cargando || inspeccionesFiltradas.length === 0} onClick={() => setMostrarInforme((visible) => !visible)} type="button">{mostrarInforme ? 'Ocultar informe' : 'Vista de informe'}</button>}
            <button className="btn btn-outline-secondary btn-sm" disabled={cargando || inspeccionesFiltradas.length === 0} onClick={exportarCsv} type="button">Exportar CSV</button>
          </div>
        </div>
        <div className="inspection-filters" aria-label="Filtros de inspecciones">
          <label>Zona<select className="form-select" value={filtro.zona} onChange={(e) => setFiltro({ ...filtro, zona: e.target.value })}><option value="">Todas</option>{zonas.map((zona) => <option key={zona.id_zona} value={zona.id_zona}>{zona.nombre}</option>)}</select></label>
          <label>Categoría<select className="form-select" value={filtro.categoria} onChange={(e) => setFiltro({ ...filtro, categoria: e.target.value })}><option value="">Todas</option>{tiposRiesgo.map((tipo) => <option key={tipo.id_tipo_riesgo} value={tipo.id_tipo_riesgo}>{tipo.nombre}</option>)}</select></label>
          <label>Estado<select className="form-select" value={filtro.estado} onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}><option value="">Todos</option>{estados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select></label>
          <label>Desde<input className="form-control" type="date" value={filtro.desde} onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })} /></label>
          <label>Hasta<input className="form-control" type="date" value={filtro.hasta} onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })} /></label>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setFiltro({ zona: '', categoria: '', estado: '', desde: '', hasta: '' })} type="button">Limpiar filtros</button>
        </div>
        {mostrarInforme && <section className="designed-report" id="print-report" aria-label="Vista previa del informe">
          <header className="designed-report-header">
            <div className="designed-report-brand"><img src="/favicon.svg" alt="" /><span>LA PAZ SEGURA<small>Registro preventivo · Proyecto académico</small></span></div>
            <span className="designed-report-date">Generado el {new Date().toLocaleDateString('es-BO')}</span>
          </header>
          <div className="designed-report-title"><div className="eyebrow">INFORME DE CONSULTA</div><h2>Inspecciones preventivas</h2><p>Observaciones registradas. Este documento no constituye diagnóstico profesional ni inventario oficial.</p></div>
          <div className="designed-report-stats">
            {estados.map((estado) => <div key={estado}><strong>{inspeccionesFiltradas.filter((i) => i.estado === estado).length}</strong><span>{estado}</span></div>)}
            <div><strong>{inspeccionesFiltradas.reduce((total, item) => total + item.fotografias.length, 0)}</strong><span>Fotografías adjuntas</span></div>
          </div>
          <div className="designed-report-filters"><strong>Filtros del informe</strong><span>{[
            filtro.zona ? `Zona: ${nombreZona.get(Number(filtro.zona)) ?? filtro.zona}` : '',
            filtro.categoria ? `Categoría: ${nombreTipo.get(Number(filtro.categoria)) ?? filtro.categoria}` : '',
            filtro.estado ? `Estado: ${filtro.estado}` : '',
            filtro.desde ? `Desde: ${filtro.desde}` : '',
            filtro.hasta ? `Hasta: ${filtro.hasta}` : '',
          ].filter(Boolean).join(' · ') || 'Sin filtros; se incluyen todas las filas visibles para esta cuenta.'}</span></div>
          <div className="designed-report-table-wrap"><table className="designed-report-table"><thead><tr><th>Fecha y zona</th><th>Prioridad / estado</th><th>Observaciones y recomendaciones</th></tr></thead><tbody>
            {inspeccionesFiltradas.map((item) => <tr key={item.id_inspeccion}><td><strong>{new Date(`${item.fecha_inspeccion}T12:00:00`).toLocaleDateString('es-BO')}</strong><span>{nombreZona.get(item.id_zona) ?? `Zona ${item.id_zona}`}</span><small>{nombreTipo.get(zonaPorId.get(item.id_zona)?.id_tipo_riesgo ?? -1) ?? 'Categoría no disponible'}</small></td><td><strong>{item.nivel_atencion}</strong><span>{item.estado}</span></td><td><p>{item.observaciones}</p>{item.recomendaciones && <small><b>Recomendaciones:</b> {item.recomendaciones}</small>}</td></tr>)}
          </tbody></table></div>
          <footer className="designed-report-footer"><span>La Paz Segura · Prototipo académico</span><span>Consulta sujeta a permisos de la cuenta activa.</span></footer>
          <button className="btn btn-dark-green designed-report-print" onClick={imprimirInforme} type="button">Imprimir / Guardar como PDF</button>
        </section>}
        {!cargando && inspecciones.length === 0 && <p className="users-empty">Todavía no hay inspecciones registradas.</p>}
        {!cargando && inspecciones.length > 0 && inspeccionesFiltradas.length === 0 && <p className="users-empty">No hay inspecciones que coincidan con estos filtros.</p>}
        {!modoInforme && <div className="inspection-list">
          {inspeccionesFiltradas.map((inspeccion) => {
            const puedeAdjuntar = rol === 'administrador' || (rol === 'inspector' && inspeccion.id_usuario === idUsuario)
            return (
              <article className="inspection-card" key={inspeccion.id_inspeccion}>
                <div className="inspection-card-heading">
                  <div>
                    <h3>{nombreZona.get(inspeccion.id_zona) ?? `Zona ${inspeccion.id_zona}`}</h3>
                    <p>{nombreTipo.get(zonaPorId.get(inspeccion.id_zona)?.id_tipo_riesgo ?? -1) ?? 'Categoría no disponible'}</p>
                    <p>{new Date(`${inspeccion.fecha_inspeccion}T12:00:00`).toLocaleDateString('es-BO')}</p>
                  </div>
                  <div className="inspection-badges">
                    <span className={`priority-badge priority-${inspeccion.nivel_atencion.toLowerCase()}`}>{inspeccion.nivel_atencion}</span>
                    <span className="user-status is-active">{inspeccion.estado}</span>
                  </div>
                </div>
                <p className="inspection-observations">{inspeccion.observaciones}</p>
                {inspeccion.recomendaciones && <p className="inspection-recommendations"><strong>Recomendaciones:</strong> {inspeccion.recomendaciones}</p>}
                <div className="inspection-photos">
                  {inspeccion.fotografias.map((foto, indice) => foto.url_firmada ? (
                    <a href={foto.url_firmada} key={foto.id_fotografia} rel="noreferrer" target="_blank">
                      <img alt={foto.descripcion || `Fotografía ${indice + 1} de ${nombreZona.get(inspeccion.id_zona) ?? 'la inspección'}`} loading="lazy" src={foto.url_firmada} />
                      <span>Fotografía {indice + 1}</span>
                    </a>
                  ) : (
                    <span className="photo-unavailable" key={foto.id_fotografia}>Fotografía no disponible</span>
                  ))}
                </div>
                {puedeAdjuntar && inspeccion.fotografias.length < 5 && (
                  <AdjuntarFotografias
                    cantidadActual={inspeccion.fotografias.length}
                    idInspeccion={inspeccion.id_inspeccion}
                    onAdjuntar={async (archivos) => {
                      await adjuntarFotografias(inspeccion, archivos)
                    }}
                  />
                )}
              </article>
            )
          })}
        </div>}
        {!puedeRegistrar && <p className="users-footnote">Tu rol es de solo lectura: no puedes registrar inspecciones ni cargar fotografías.</p>}
      </section>
    </section>
  )
}

function AdjuntarFotografias({
  cantidadActual,
  idInspeccion,
  onAdjuntar,
}: {
  cantidadActual: number
  idInspeccion: number
  onAdjuntar: (archivos: File[]) => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorLocal, setErrorLocal] = useState('')
  const quedan = Math.max(0, 5 - cantidadActual)

  async function seleccionar(evento: ChangeEvent<HTMLInputElement>) {
    const seleccionadas = Array.from(evento.target.files ?? [])
    evento.target.value = ''
    if (seleccionadas.length === 0) return
    if (seleccionadas.length > quedan) {
      setErrorLocal(`Puedes seleccionar hasta ${quedan} fotografía(s) para esta inspección.`)
      return
    }
    setProcesando(true)
    setErrorLocal('')
    const comprimidas: File[] = []
    for (const archivo of seleccionadas) {
      if (!tipoArchivoPermitido(archivo)) {
        setErrorLocal('Solo se permiten imágenes JPG, PNG o WebP.')
        continue
      }
      try {
        const comprimida = await comprimirFotografia(archivo)
        if (comprimida.size <= TAMANO_MAXIMO_STORAGE) comprimidas.push(comprimida)
        else setErrorLocal('Se rechazó una imagen que supera el límite de 1 MB tras comprimirla.')
      } catch (errorCompresion) {
        setErrorLocal(errorCompresion instanceof Error ? errorCompresion.message : 'No se pudo comprimir una imagen.')
      }
    }
    try {
      if (comprimidas.length > 0) await onAdjuntar(comprimidas)
    } catch {
      setErrorLocal('No se pudieron adjuntar las fotografías. Revisa la conexión e inténtalo de nuevo.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="inspection-attach">
      <input accept={extensionesPermitidas()} className="visually-hidden" disabled={procesando} id={`attach-photos-${idInspeccion}`} multiple onChange={(evento) => void seleccionar(evento)} ref={inputRef} type="file" />
      <button className="btn btn-outline-secondary btn-sm" disabled={procesando || quedan === 0} onClick={() => inputRef.current?.click()} type="button">
        {procesando ? 'Procesando…' : `Adjuntar fotografías (${quedan} disponibles)`}
      </button>
      <span>JPG, PNG o WebP; máximo 1 MB cada una.</span>
      {errorLocal && <span className="inspection-attach-error" role="alert">{errorLocal}</span>}
    </div>
  )
}

export default InspeccionesPage
