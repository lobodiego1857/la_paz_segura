export type RolUsuario = 'administrador' | 'inspector'
export type EstadoSeguimiento = 'Pendiente' | 'En seguimiento' | 'Cerrada'
export type NivelAtencion = 'Baja' | 'Media' | 'Alta'

export interface PerfilUsuario {
  id_usuario: string
  nombre: string
  correo: string
  rol: RolUsuario
  activo: boolean
  fecha_creacion: string
}

export interface Zona {
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

export interface Inspeccion {
  id_inspeccion: number
  id_zona: number
  id_usuario: string
  fecha_inspeccion: string
  observaciones: string
  nivel_atencion: NivelAtencion
  recomendaciones: string | null
  estado: EstadoSeguimiento
  fecha_actualizacion: string
}

export interface Seguimiento {
  id_seguimiento: number
  id_inspeccion: number
  id_usuario: string
  estado_nuevo: EstadoSeguimiento
  comentario: string
  fecha_cambio: string
  accion: string | null
  fecha_prevista: string | null
  resultado: string | null
}

export const TIPOS_RIESGO_INICIALES = [
  'Deslizamiento',
  'Derrumbe',
  'Grieta',
  'Filtración',
  'Inundación',
  'Otro',
] as const
