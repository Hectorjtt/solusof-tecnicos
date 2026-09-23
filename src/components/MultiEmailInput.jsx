/** Uno o más campos de correo electrónico, con botón para agregar otro y
 * quitar los que sobren. `value` es siempre un arreglo (nunca vacío en
 * pantalla -- si no hay ninguno se muestra un campo en blanco). */
export function MultiEmailInput({ value, onChange, idPrefix = 'correo' }) {
  const correos = value && value.length > 0 ? value : ['']

  function cambiarCorreo(i, texto) {
    const siguiente = [...correos]
    siguiente[i] = texto
    onChange(siguiente)
  }

  function agregar() {
    onChange([...correos, ''])
  }

  function quitar(i) {
    const siguiente = correos.filter((_, idx) => idx !== i)
    onChange(siguiente.length > 0 ? siguiente : [''])
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      {correos.map((correo, i) => (
        <div key={i} className="row" style={{ gap: 6 }}>
          <input
            id={i === 0 ? idPrefix : undefined}
            type="email"
            value={correo}
            onChange={(e) => cambiarCorreo(i, e.target.value)}
            style={{ flex: 1 }}
          />
          {correos.length > 1 && (
            <button
              type="button"
              className="btn-icon"
              title="Quitar este correo"
              onClick={() => quitar(i)}
            >
              🗑️
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start', minHeight: 36, padding: '6px 12px' }} onClick={agregar}>
        + Agregar otro correo
      </button>
    </div>
  )
}
