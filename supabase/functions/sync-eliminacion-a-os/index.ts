// Edge Function: sync-eliminacion-a-os
//
// Se llama cuando se "elimina" (oculta) un servicio en Tecnicos, ver
// ocultarServicio() en src/lib/servicios.js. Avisa a OS para que borre su
// copia (ya sea el pendiente por aprobar o el servicio ya aprobado) --
// mismo secreto compartido y mismo patron servidor-a-servidor que
// sync-servicio-a-os.

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

const OS_SYNC_URL = 'https://us-central1-solusof-32a69.cloudfunctions.net/eliminarServicioDesdeTecnicos'

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

    const res = await fetch(OS_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sync-secret': osSyncSecret },
      body: JSON.stringify({ servicioId }),
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
