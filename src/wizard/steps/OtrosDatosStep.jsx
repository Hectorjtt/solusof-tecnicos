import { useMemo } from 'react'
import { ChecklistField } from '../../components/ChecklistField'
import { OTROS_DATOS_GROUPS } from '../fieldsConfig'
import { useServicioWizard } from '../ServicioWizardContext'

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
            <div className="grid-2">
              {group.fields.map((field) => (
                <ChecklistField
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  onChange={handlers[field.key]}
                />
              ))}
            </div>
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
