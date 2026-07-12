import { useMemo } from 'react'
import { ChecklistField } from '../../components/ChecklistField'
import { useServicioWizard } from '../ServicioWizardContext'

/** Paso genérico para las secciones de checklist "planas" (tabla 1:1 + lista de campos). */
export function GenericChecklistStep({ step }) {
  const { childData, updateField } = useServicioWizard()
  const values = childData[step.table] ?? {}

  // Un handler estable por campo: tocar un checkbox no debe recrear la función
  // de los demás y forzarlos a re-renderizar (ChecklistField está memoizado).
  const handlers = useMemo(() => {
    const map = {}
    for (const field of step.fields) {
      map[field.key] = (v) =>
        updateField(step.table, field.key, v, { immediate: field.type === 'checkbox' })
    }
    return map
  }, [step, updateField])

  return (
    <div className="panel">
      {step.fields.map((field) => (
        <ChecklistField
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={handlers[field.key]}
        />
      ))}
    </div>
  )
}
