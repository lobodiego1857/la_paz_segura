import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Totales = { zonasActivas: number; inspecciones: number; pendientes: number; enSeguimiento: number; cerradas: number }
const vacio: Totales = { zonasActivas: 0, inspecciones: 0, pendientes: 0, enSeguimiento: 0, cerradas: 0 }

function ResumenPage() {
  const [totales, setTotales] = useState<Totales>(vacio)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [actualizacion, setActualizacion] = useState(0)

  const cargar = useCallback(async () => {
    if (!supabase) {
      setError('Supabase no está configurado en este entorno.')
      setCargando(false)
      return
    }
    setCargando(true)
    setError('')
    try {
      const [zonas, total, pendientes, enSeguimiento, cerradas] = await Promise.all([
        supabase.from('zonas').select('id_zona', { count: 'exact', head: true }).eq('activa', true),
        supabase.from('inspecciones').select('id_inspeccion', { count: 'exact', head: true }),
        supabase.from('inspecciones').select('id_inspeccion', { count: 'exact', head: true }).eq('estado', 'Pendiente'),
        supabase.from('inspecciones').select('id_inspeccion', { count: 'exact', head: true }).eq('estado', 'En seguimiento'),
        supabase.from('inspecciones').select('id_inspeccion', { count: 'exact', head: true }).eq('estado', 'Cerrada'),
      ])
      const resultados = [zonas, total, pendientes, enSeguimiento, cerradas]
      const fallo = resultados.some((resultado) => resultado.error)
      if (fallo) {
        setError('No se pudieron consultar los totales. Comprueba la sesión y los permisos de lectura.')
        return
      }
      setTotales({
        zonasActivas: zonas.count ?? 0,
        inspecciones: total.count ?? 0,
        pendientes: pendientes.count ?? 0,
        enSeguimiento: enSeguimiento.count ?? 0,
        cerradas: cerradas.count ?? 0,
      })
    } catch {
      setError('No se pudo conectar con Supabase para cargar el resumen.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void cargar() }, [cargar, actualizacion])

  const tarjetas: Array<{ titulo: string; valor: number }> = [
    { titulo: 'Zonas activas', valor: totales.zonasActivas },
    { titulo: 'Inspecciones', valor: totales.inspecciones },
    { titulo: 'Pendientes', valor: totales.pendientes },
    { titulo: 'En seguimiento', valor: totales.enSeguimiento },
    { titulo: 'Cerradas', valor: totales.cerradas },
  ]

  return <section className="summary-panel" aria-labelledby="summary-title">
    <div className="section-heading summary-heading">
      <div><div className="eyebrow">DATOS CONSULTADOS CON TU SESIÓN</div><h2 id="summary-title">Resumen del registro</h2></div>
      <button className="btn btn-outline-secondary btn-sm" disabled={cargando} onClick={() => setActualizacion((n) => n + 1)} type="button">Actualizar</button>
    </div>
    {error && <div className="access-message is-error" role="alert">{error}</div>}
    <div className="summary-cards" aria-live="polite" aria-busy={cargando}>
      {tarjetas.map((tarjeta) => <article className="summary-card" key={tarjeta.titulo}><span>{tarjeta.titulo}</span><strong>{cargando ? '…' : tarjeta.valor}</strong></article>)}
    </div>
    <p className="summary-note">Los totales respetan los permisos de lectura configurados en Supabase. No representan una evaluación profesional ni un inventario oficial.</p>
  </section>
}

export default ResumenPage
