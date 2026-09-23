// Lista de clientes para el autocompletar de "Cliente" al crear un servicio.
// Viene de OS (repo Firebase aparte): ahí cada unidad de Wialon vive bajo una
// "cuenta", y esa cuenta ES el cliente (no hay un campo "Cliente" separado
// en Wialon) -- ver exports.listarClientesWialon en functions/index.js de OS.
// Es un endpoint público de solo lectura (nombres de empresas, nada
// sensible), cacheado en memoria por el rato que dure la pestaña abierta
// para no pedirlo de nuevo en cada formulario.

const CLIENTES_WIALON_URL = 'https://us-central1-solusof-32a69.cloudfunctions.net/listarClientesWialon'

// Algunas cuentas de Wialon tienen un nombre técnico/interno que no es el
// nombre real del cliente -- se muestran (y si se elige esa opción, es lo
// que se guarda) con el nombre de este diccionario en vez del que manda OS.
const ALIAS_CLIENTE = {
  Truper_Master: 'TRUPER DVR',
}

let cache = null

export async function listarClientesWialon() {
  if (cache) return cache
  try {
    const res = await fetch(CLIENTES_WIALON_URL)
    const data = await res.json()
    const nombres = Array.isArray(data.nombres) ? data.nombres : []
    cache = nombres.map((nombre) => ALIAS_CLIENTE[nombre] || nombre)
  } catch (err) {
    console.error('No se pudo cargar la lista de clientes de Wialon:', err)
    cache = []
  }
  return cache
}
