import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Falta VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.example a .env y complétalo.',
  )
}

// Tras un rato sin usar la app (dispositivo dormido, red que se cayó y
// reconecta), el navegador a veces reutiliza una conexión ya muerta y la
// petición se queda colgada sin resolver ni fallar nunca -- sin este
// timeout, cualquier pantalla que dependa de esa petición se queda
// cargando para siempre hasta que el usuario refresca a mano.
const FETCH_TIMEOUT_MS = 15000

function fetchConTimeout(input, init) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  return fetch(input, { ...init, signal: init?.signal ?? controller.signal }).finally(() =>
    clearTimeout(timeoutId),
  )
}

export const supabase = createClient(url, anonKey, {
  global: { fetch: fetchConTimeout },
})
