// Edge Function: create-technician
//
// Unico camino para dar de alta una cuenta (admin o tecnico). El cliente
// nunca tiene la service role key -- esta funcion si, y por eso es la que
// puede crear un auth.users que no es el usuario que hace la llamada.
// Solo un admin ya logueado puede invocarla (se valida abajo).

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
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerJwt = authHeader.replace('Bearer ', '')
    if (!callerJwt) return json({ error: 'Falta token de autorizacion.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Cliente con permisos totales (bypassa RLS) -- solo vive en el servidor.
    const admin = createClient(supabaseUrl, serviceRoleKey)

    // Identifica quien llama y confirma que es admin.
    const { data: callerData, error: callerErr } = await admin.auth.getUser(callerJwt)
    if (callerErr || !callerData?.user) return json({ error: 'Token invalido.' }, 401)

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', callerData.user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return json({ error: 'Solo un administrador puede crear cuentas.' }, 403)
    }

    const body = await req.json()
    const { email, password, nombre, telefono, role } = body ?? {}

    if (!email || !password || !nombre || !role) {
      return json({ error: 'Faltan campos: email, password, nombre, role.' }, 400)
    }
    if (role !== 'admin' && role !== 'tecnico') {
      return json({ error: "role debe ser 'admin' o 'tecnico'." }, 400)
    }
    if (String(password).length < 6) {
      return json({ error: 'La contrasena debe tener al menos 6 caracteres.' }, 400)
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    })

    if (createErr || !created?.user) {
      return json({ error: createErr?.message ?? 'No se pudo crear el usuario.' }, 400)
    }

    const { error: profileErr } = await admin.from('profiles').insert({
      id: created.user.id,
      role,
      nombre,
      telefono: telefono ?? null,
      activo: true,
    })

    if (profileErr) {
      // Sin fila en profiles el usuario queda huerfano -- se revierte la creacion.
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: `No se pudo crear el perfil: ${profileErr.message}` }, 400)
    }

    return json({ id: created.user.id, email, nombre, role })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error inesperado.' }, 500)
  }
})
