import { memo } from 'react'

/**
 * Renderiza un campo del checklist (checkbox/number/text/textarea), editable
 * o de solo lectura. Se reusa tanto en los pasos del wizard del técnico como
 * en el resumen de revisión del admin, para que ambos siempre muestren
 * exactamente los mismos campos.
 *
 * Memoizado: si `onChange` es una referencia estable por campo (ver
 * GenericChecklistStep/OtrosDatosStep), tocar un campo no re-renderiza los
 * demás -- es lo que evita que el checklist se sienta pesado en el celular.
 */
export const ChecklistField = memo(function ChecklistField({ field, value, onChange, readOnly = false }) {
  const { key, label, type, suffix } = field

  if (readOnly) {
    if (type === 'checkbox') {
      return (
        <div className="checklist-item">
          <span aria-hidden style={{ width: 22, flexShrink: 0 }}>
            {value ? '✅' : '⬜️'}
          </span>
          <label>{label}</label>
        </div>
      )
    }
    if (type === 'textarea') {
      return (
        <div className="field">
          {label && <label>{label}</label>}
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{value ? value : <span className="muted">— sin datos —</span>}</p>
        </div>
      )
    }
    return (
      <div className="row-between" style={{ padding: '8px 4px', borderBottom: '1px solid var(--border)' }}>
        <span className="muted text-sm">{label}</span>
        <strong>{value !== null && value !== undefined && value !== '' ? `${value}${suffix ? ' ' + suffix : ''}` : '—'}</strong>
      </div>
    )
  }

  if (type === 'checkbox') {
    return (
      <div className="checklist-item">
        <input
          id={`f-${key}`}
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor={`f-${key}`}>{label}</label>
      </div>
    )
  }

  if (type === 'textarea') {
    return (
      <div className="field">
        {label && <label htmlFor={`f-${key}`}>{label}</label>}
        <textarea
          id={`f-${key}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Opcional"
        />
      </div>
    )
  }

  return (
    <div className="field">
      <label htmlFor={`f-${key}`}>
        {label} {suffix ? `(${suffix})` : ''}
      </label>
      <input
        id={`f-${key}`}
        type={type === 'number' ? 'number' : 'text'}
        inputMode={type === 'number' ? 'decimal' : undefined}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Opcional"
      />
    </div>
  )
})
