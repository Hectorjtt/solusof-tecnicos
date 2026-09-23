import { useMemo, useRef, useState } from 'react'

/** Input de texto normal (se puede escribir cualquier cosa, no solo lo que
 * esté en `options`) con una lista de sugerencias abajo mientras se escribe.
 * Pensado para el "Cliente" de Nuevo servicio, con la lista de clientes de
 * Wialon -- pero es genérico, no depende de eso. */
export function AutocompleteInput({ id, value, onChange, options, placeholder, required }) {
  const [abierto, setAbierto] = useState(false)
  const [resaltado, setResaltado] = useState(-1)
  const blurTimer = useRef(null)

  const sugerencias = useMemo(() => {
    const q = (value || '').trim().toLowerCase()
    if (!q) return []
    // Los que EMPIEZAN con lo escrito van antes que los que solo lo
    // contienen en medio (ej. buscando "transportes", "TRANSPORTES
    // LOGISTICA" sale antes que "SYCMEX TRANSPORTES...") -- si no, con
    // términos comunes los que empiezan con la palabra buscada podían
    // quedar fuera del límite antes de llegar a ellos alfabéticamente.
    return (options || [])
      .filter((o) => o.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1
        const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1
        return aStarts - bStarts
      })
      .slice(0, 20)
  }, [value, options])

  function elegir(opcion) {
    onChange(opcion)
    setAbierto(false)
    setResaltado(-1)
  }

  function onKeyDown(e) {
    if (!abierto || sugerencias.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setResaltado((i) => Math.min(i + 1, sugerencias.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setResaltado((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && resaltado >= 0) {
      e.preventDefault()
      elegir(sugerencias[resaltado])
    } else if (e.key === 'Escape') {
      setAbierto(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type="text"
        required={required}
        placeholder={placeholder}
        value={value ?? ''}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value)
          setAbierto(true)
          setResaltado(-1)
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          // Delay para que el click en una sugerencia registre antes de cerrar.
          blurTimer.current = setTimeout(() => setAbierto(false), 150)
        }}
        onKeyDown={onKeyDown}
      />
      {abierto && sugerencias.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            zIndex: 30,
            top: '100%',
            left: 0,
            right: 0,
            margin: '4px 0 0',
            padding: 4,
            listStyle: 'none',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {sugerencias.map((opcion, i) => (
            <li key={opcion}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // mousedown (no click) para que dispare antes del blur del input.
                  e.preventDefault()
                  clearTimeout(blurTimer.current)
                  elegir(opcion)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: 4,
                  background: i === resaltado ? 'var(--accent-light)' : 'transparent',
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                {opcion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
