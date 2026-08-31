// Edge Function: sync-servicio-a-os
//
// Se llama justo despues de crear un servicio (ver NuevoServicioForm.jsx),
// para avisarle a SolusofOscuro (OS, repo Firebase aparte) que se creo un
// servicio nuevo aqui. No escribe directo en OS desde el navegador del admin
// -- eso expondria el secreto compartido en el bundle de React. Esta funcion
// si tiene el secreto (Deno.env, nunca llega al cliente) y hace la llamada
// servidor-a-servidor a la Cloud Function de OS.
//
// OS no lo agrega directo a su tabla de servicios: lo deja en una coleccion
// de "pendientes por aprobar" (mismo patron que "Sugerencias Pendientes" en
// su pagina de Rentas) -- alguien ahi decide si lo aprueba o lo rechaza.

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

// URL fija de la Cloud Function de OS (no es secreta, es publica por
// diseno -- el secreto va en el header x-sync-secret).
const OS_SYNC_URL = 'https://us-central1-solusof-32a69.cloudfunctions.net/syncServicioDesdeTecnicos'

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

    // Confirma que quien llama es un usuario real logueado (no valida rol
    // especifico -- solo un admin puede llegar a este punto del flujo, ya
    // que NuevoServicioForm.jsx es una pagina de admin).
    const { data: callerData, error: callerErr } = await admin.auth.getUser(callerJwt)
    if (callerErr || !callerData?.user) return json({ error: 'Token invalido.' }, 401)

    const { servicioId } = (await req.json()) ?? {}
    if (!servicioId) return json({ error: 'Falta servicioId.' }, 400)

    // Vuelve a leer el servicio completo de Postgres -- no confia en datos
    // que mande el cliente, para que el mapeo salga siempre de la fuente real.
    const { data: servicio, error: servicioErr } = await admin
      .from('servicios')
      .select('numero_servicio, tipo_servicio, cliente_nombre, imei_gps, placas, tecnico_id')
      .eq('id', servicioId)
      .single()

    if (servicioErr || !servicio) {
      return json({ error: servicioErr?.message ?? 'Servicio no encontrado.' }, 404)
    }

    let tecnicoNombre: string | null = null
    if (servicio.tecnico_id) {
      const { data: tecnico } = await admin
        .from('profiles')
        .select('nombre')
        .eq('id', servicio.tecnico_id)
        .single()
      tecnicoNombre = tecnico?.nombre ?? null
    }

    const res = await fetch(OS_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sync-secret': osSyncSecret },
      body: JSON.stringify({
        servicioId,
        numeroServicio: servicio.numero_servicio,
        tipoServicio: servicio.tipo_servicio,
        clienteNombre: servicio.cliente_nombre,
        imei: servicio.imei_gps,
        placas: servicio.placas,
        tecnicoNombre,
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
