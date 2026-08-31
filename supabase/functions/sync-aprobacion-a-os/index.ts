// Edge Function: sync-aprobacion-a-os
//
// Se llama justo despues de aprobar un servicio (ver AdminServicioDetalle.jsx,
// funcion aprobar()), para mandarle a OS el nombre de quien aprobo -- llena
// "Usuario Elaboro Reporte" y "SOP Atendio" alla. A diferencia de
// sync-servicio-a-os (que crea el pendiente completo), esto solo actualiza
// esos dos campos -- no toca nada mas de lo que ya haya en OS.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const OS_SYNC_URL = 'https://us-central1-solusof-32a69.cloudfunctions.net/syncAprobacionServicioTecnicos'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerJwt = authHeader.replace('Bearer ', '')
    if (!callerJwt) return json({ error: 'Falta token de autorizacion.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const osSyncSecret = Deno.env.get('OS_SYNC_SECRET')!

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerData, error: callerErr } = await admin.auth.getUser(callerJwt)
    if (callerErr || !callerData?.user) return json({ error: 'Token invalido.' }, 401)

    const { servicioId } = (await req.json()) ?? {}
    if (!servicioId) return json({ error: 'Falta servicioId.' }, 400)

    // Vuelve a leer el servicio de Postgres -- no confia en un nombre que
    // mande el cliente, usa el que ya quedo guardado al aprobar.
    const { data: servicio, error: servicioErr } = await admin
      .from('servicios')
      .select('status, aprobado_por_nombre')
      .eq('id', servicioId)
      .single()

    if (servicioErr || !servicio) {
      return json({ error: servicioErr?.message ?? 'Servicio no encontrado.' }, 404)
    }
    if (servicio.status !== 'aprobado' || !servicio.aprobado_por_nombre) {
      return json({ error: 'El servicio no esta aprobado o no tiene aprobador.' }, 400)
    }

    const res = await fetch(OS_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sync-secret': osSyncSecret },
      body: JSON.stringify({
        servicioId,
        aprobadoPorNombre: servicio.aprobado_por_nombre,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      return json({ error: `OS respondio ${res.status}: ${errBody}` }, 502)
    }

    return json({ ok: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error inesperado.' }, 500)
  }
})
