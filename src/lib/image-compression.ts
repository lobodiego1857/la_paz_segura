const TAMANO_OBJETIVO = 950 * 1024
const TAMANO_MAXIMO_STORAGE = 1024 * 1024
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']

function blobDeCanvas(canvas: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('No se pudo procesar la imagen.'))
    }, tipo, calidad)
  })
}

function nombreArchivo(nombre: string, extension: string): string {
  const base = nombre.replace(/\.[^.]+$/, '').trim() || 'fotografia'
  return `${base}.${extension}`
}

export async function comprimirFotografia(archivo: File): Promise<File> {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WebP.')
  }
  if (archivo.size <= TAMANO_OBJETIVO) return archivo
  if (typeof createImageBitmap !== 'function') {
    throw new Error('Este navegador no permite comprimir la imagen. Prueba con una imagen de menos de 1 MB.')
  }

  const imagen = await createImageBitmap(archivo)
  const ladoMayor = Math.max(imagen.width, imagen.height)
  let escala = Math.min(1, 2400 / ladoMayor)
  const tipoSalida = archivo.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp'
  const canvas = document.createElement('canvas')

  try {
    for (let intento = 0; intento < 12; intento += 1) {
      const calidad = Math.max(0.42, 0.86 - (intento % 4) * 0.12)
      canvas.width = Math.max(1, Math.round(imagen.width * escala))
      canvas.height = Math.max(1, Math.round(imagen.height * escala))
      const contexto = canvas.getContext('2d')
      if (!contexto) throw new Error('No se pudo preparar la compresión de la imagen.')
      contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height)

      const blob = await blobDeCanvas(canvas, tipoSalida, calidad)
      if (blob.size <= TAMANO_OBJETIVO) {
        if (!TIPOS_PERMITIDOS.includes(blob.type)) {
          throw new Error('El navegador generó un formato de imagen no compatible.')
        }
        const extension = extensionFotografia(blob.type)
        return new File([blob], nombreArchivo(archivo.name, extension), {
          type: blob.type,
          lastModified: archivo.lastModified,
        })
      }

      if (intento % 4 === 3) escala *= 0.8
    }
  } finally {
    imagen.close()
    canvas.width = 0
    canvas.height = 0
  }

  throw new Error(`La imagen no se pudo reducir a menos de ${Math.floor(TAMANO_MAXIMO_STORAGE / 1024)} KB.`)
}

export { TAMANO_MAXIMO_STORAGE, TIPOS_PERMITIDOS }

function extensionFotografia(tipo: string): string {
  if (tipo === 'image/jpeg') return 'jpg'
  if (tipo === 'image/png') return 'png'
  return 'webp'
}
