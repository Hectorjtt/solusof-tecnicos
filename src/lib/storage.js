import { supabase } from './supabaseClient'

const BUCKET = 'evidencias'

export function fotoPath(servicioId, slotKey) {
  return `servicios/${servicioId}/fotos/${slotKey.replace(':', '_')}.jpg`
}

export function firmaPath(servicioId) {
  return `servicios/${servicioId}/firma.png`
}

export function firmaClientePath(servicioId) {
  return `servicios/${servicioId}/firma_cliente.png`
}

export function reportePdfPath(servicioId) {
  return `servicios/${servicioId}/reporte.pdf`
}

export async function subirArchivo(path, file) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })
  if (error) throw error
  return path
}

export async function eliminarArchivo(path) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}

const urlCache = new Map()

export async function getSignedUrl(path) {
  if (!path) return null
  const cached = urlCache.get(path)
  if (cached && cached.expiresAt > Date.now()) return cached.url
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error) return null
  urlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 55 * 60 * 1000 })
  return data.signedUrl
}
