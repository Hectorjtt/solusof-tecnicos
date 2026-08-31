// Edge Function: contar-servicios-hoy
//
// Devuelve solo un numero (cuantos servicios se crearon hoy en Tecnicos) --
// nada sensible, por eso es publica (sin token) a diferencia de las demas
// funciones de este proyecto. La llama el dashboard de SolusofOscuro (OS,
// repo Firebase aparte) para sumarlo a su propia tarjeta "Servicios Hoy".

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const hoy = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { count, error } = await admin
      .from('servicios')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${hoy}T00:00:00Z`)
      .lt('created_at', `${manana}T00:00:00Z`)

    if (error) return json({ error: error.message }, 500)

    return json({ count: count ?? 0 })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error inesperado.' }, 500)
  }
})
