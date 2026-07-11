import { ChecklistField } from '../../components/ChecklistField'
import { useServicioWizard } from '../ServicioWizardContext'

/** Paso genérico para las secciones de checklist "planas" (tabla 1:1 + lista de campos). */
export function GenericChecklistStep({ step }) {
  const { childData, updateField } = useServicioWizard()
  const values = childData[step.table] ?? {}

  return (
    <div className="panel">
      {step.fields.map((field) => (
        <ChecklistField
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(v) =>
            updateField(step.table, field.key, v, { immediate: field.type === 'checkbox' })
          }
        />
      ))}
    </div>
  )
}
