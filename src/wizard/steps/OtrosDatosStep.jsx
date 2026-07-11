import { ChecklistField } from '../../components/ChecklistField'
import { OTROS_DATOS_GROUPS } from '../fieldsConfig'
import { useServicioWizard } from '../ServicioWizardContext'

export function OtrosDatosStep() {
  const { childData, updateField } = useServicioWizard()
  const values = childData.otros_datos ?? {}

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
                  onChange={(v) => updateField('otros_datos', field.key, v)}
                />
              ))}
            </div>
          ) : (
            group.fields.map((field) => (
              <ChecklistField
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(v) => updateField('otros_datos', field.key, v)}
              />
            ))
          )}
        </div>
      ))}
    </>
  )
}
