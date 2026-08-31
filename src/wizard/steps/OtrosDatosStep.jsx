import { useMemo, useState } from 'react'
import { ChecklistField } from '../../components/ChecklistField'
import { OTROS_DATOS_GROUPS } from '../fieldsConfig'
import { useServicioWizard } from '../ServicioWizardContext'

// "otros_material" se guarda como un solo texto (columna fija en otros_datos,
// no hay tabla de filas dinámicas como accesorios_instalados), así que para
// permitir "agregar los que necesiten" se editan como varias cajitas en la UI
// y se guardan juntas separadas por coma en esa misma columna.
function OtrosMaterialField({ value, onChange }) {
  const inicial = (value ?? '').split(', ').filter((s) => s !== '')
  const [items, setItems] = useState(inicial.length ? inicial : [''])

  function setItem(i, v) {
    const next = [...items]
    next[i] = v
    setItems(next)
    onChange(next.filter((s) => s.trim() !== '').join(', '))
  }

  function addItem() {
    setItems((prev) => [...prev, ''])
  }

  return (
    <div className="field">
      <label>Otros</label>
      {items.map((v, i) => (
        <input
          key={i}
          type="text"
          value={v}
          placeholder="Especifica"
          onChange={(e) => setItem(i, e.target.value)}
          style={{ marginBottom: 6 }}
        />
      ))}
      <button type="button" className="btn" onClick={addItem}>
        + Agregar otro
      </button>
    </div>
  )
}

export function OtrosDatosStep() {
  const { childData, updateField } = useServicioWizard()
  const values = childData.otros_datos ?? {}

  const handlers = useMemo(() => {
    const map = {}
    for (const group of OTROS_DATOS_GROUPS) {
      for (const field of group.fields) {
        map[field.key] = (v) => updateField('otros_datos', field.key, v)
      }
    }
    return map
  }, [updateField])

  return (
    <>
      {OTROS_DATOS_GROUPS.map((group) => (
        <div className="panel" key={group.title}>
          <h2>{group.title}</h2>
          {group.title === 'Material utilizado' ? (
            <>
              <div className="grid-2">
                {group.fields
                  .filter((field) => field.key !== 'otros_material')
                  .map((field) => (
                    <ChecklistField
                      key={field.key}
                      field={field}
                      value={values[field.key]}
                      onChange={handlers[field.key]}
                    />
                  ))}
              </div>
              <OtrosMaterialField value={values.otros_material} onChange={handlers.otros_material} />
            </>
          ) : (
            group.fields.map((field) => (
              <ChecklistField
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={handlers[field.key]}
              />
            ))
          )}
        </div>
      ))}
    </>
  )
}
