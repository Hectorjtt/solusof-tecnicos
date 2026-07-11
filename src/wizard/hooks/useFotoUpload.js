import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { fotoPath, getSignedUrl, subirArchivo } from '../../lib/storage'
import { useServicioWizard } from '../ServicioWizardContext'
import { pendingKey, savePending, getPending, deletePending } from './pendingUploadsDb'

/** Estado y subida (con reintento) de UNA foto de un slot fijo o dinámico. */
export function useFotoUpload(servicioId, foto) {
  const { updateFotoLocal } = useServicioWizard()
  const [status, setStatus] = useState(foto.storage_path ? 'subida' : 'idle')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [remoteUrl, setRemoteUrl] = useState(null)
  const [hasPending, setHasPending] = useState(false)

  useEffect(() => {
    let active = true
    if (foto.storage_path) {
      getSignedUrl(foto.storage_path).then((url) => {
        if (active) setRemoteUrl(url)
      })
      setStatus('subida')
    } else {
      setRemoteUrl(null)
    }
    return () => {
      active = false
    }
  }, [foto.storage_path])

  useEffect(() => {
    let active = true
    if (!foto.storage_path) {
      getPending(pendingKey(servicioId, foto.slot_key)).then((rec) => {
        if (active && rec) {
          setHasPending(true)
          setStatus('error')
          setPreviewUrl(URL.createObjectURL(rec.blob))
        }
      })
    }
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function doUpload(file) {
    setStatus('subiendo')
    const path = fotoPath(servicioId, foto.slot_key)
    try {
      await subirArchivo(path, file)
      const { data, error } = await supabase
        .from('fotos')
        .update({ storage_path: path, subido_en: new Date().toISOString() })
        .eq('id', foto.id)
        .select()
        .single()
      if (error) throw error
      updateFotoLocal(data)
      setStatus('subida')
      setHasPending(false)
      await deletePending(pendingKey(servicioId, foto.slot_key))
    } catch {
      setStatus('error')
      setHasPending(true)
      await savePending(pendingKey(servicioId, foto.slot_key), file, {
        servicioId,
        slotKey: foto.slot_key,
      })
    }
  }

  function handleFile(file) {
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    doUpload(file)
  }

  async function retry() {
    const rec = await getPending(pendingKey(servicioId, foto.slot_key))
    if (rec) doUpload(rec.blob)
  }

  async function quitar() {
    if (foto.storage_path) {
      await supabase.storage.from('evidencias').remove([foto.storage_path])
      const { data } = await supabase
        .from('fotos')
        .update({ storage_path: null, subido_en: null })
        .eq('id', foto.id)
        .select()
        .single()
      if (data) updateFotoLocal(data)
    }
    await deletePending(pendingKey(servicioId, foto.slot_key))
    setPreviewUrl(null)
    setRemoteUrl(null)
    setHasPending(false)
    setStatus('idle')
  }

  return { status, previewUrl, remoteUrl, hasPending, handleFile, retry, quitar }
}
