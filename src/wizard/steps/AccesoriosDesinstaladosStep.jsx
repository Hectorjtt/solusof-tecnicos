import { ACCESORIOS_CATALOG } from '../accesoriosCatalog'
import { useServicioWizard } from '../ServicioWizardContext'

// Solo para servicios de tipo "desinstalacion_instalacion": mismo catálogo
// que "Accesorios instalados", pero para dejar constancia de qué se retiró
// de la unidad. Igual que "Accesorios revisados", sin fotos -- las fotos son
// solo para lo que el técnico instala hoy.
export function AccesoriosDesinstaladosStep() {
  const {
    accesoriosDesinstalados,
    toggleAccesorioDesinstalado,
    setAccesorioDesinstaladoEtiqueta,
    agregarOtroAccesorioDesinstalado,
  } = useServicioWizard()

  function rowFor(key) {
    return accesoriosDesinstalados.find((a) => a.accesorio_key === key)
  }

  const fijos = ACCESORIOS_CATALOG.filter((item) => !item.esPersonalizado)
  const otros = accesoriosDesinstalados
    .filter((a) => a.es_personalizado)
    .sort((a, b) => a.accesorio_key.localeCompare(b.accesorio_key, undefined, { numeric: true }))

  return (
    <div className="panel">
      <p className="text-sm muted" style={{ marginTop: 0 }}>
        Marca los accesorios que se retiran de la unidad en este servicio.
        Esto no pide fotos — las fotos solo aplican a lo que instales hoy.
      </p>
      {fijos.map((item) => {
        const row = rowFor(item.key)
        if (!row) return null
        return (
          <div className="checklist-item" key={item.key}>
            <input
              id={`acc-des-${item.key}`}
              type="checkbox"
              checked={!!row.checked}
              onChange={(e) => toggleAccesorioDesinstalado(item.key, e.target.checked)}
            />
            <label htmlFor={`acc-des-${item.key}`}>{item.label}</label>
          </div>
        )
      })}
      {otros.map((row) => (
        <div className="checklist-item" key={row.accesorio_key}>
          <input
            id={`acc-des-${row.accesorio_key}`}
            type="checkbox"
            checked={!!row.checked}
            onChange={(e) => toggleAccesorioDesinstalado(row.accesorio_key, e.target.checked)}
          />
          <label htmlFor={`acc-des-${row.accesorio_key}`}>Otro:</label>
          <input
            type="text"
            placeholder="Especifica el accesorio"
            value={row.etiqueta ?? ''}
            onChange={(e) => {
              const texto = e.target.value
              setAccesorioDesinstaladoEtiqueta(row.accesorio_key, texto)
              const debeEstarMarcado = texto.trim() !== ''
              if (debeEstarMarcado !== !!row.checked) toggleAccesorioDesinstalado(row.accesorio_key, debeEstarMarcado)
            }}
          />
        </div>
      ))}
      <button type="button" className="btn" onClick={agregarOtroAccesorioDesinstalado}>
        + Agregar otro
      </button>
    </div>
  )
}
