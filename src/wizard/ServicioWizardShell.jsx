import { useSearchParams } from 'react-router-dom'
import { CHECKLIST_STEPS } from './fieldsConfig'
import { GenericChecklistStep } from './steps/GenericChecklistStep'
import { AccesoriosStep } from './steps/AccesoriosStep'
import { OtrosDatosStep } from './steps/OtrosDatosStep'
import { EvidenciasStep } from './steps/EvidenciasStep'
import { FirmaStep } from './steps/FirmaStep'

function renderStep(step, servicioId) {
  switch (step.key) {
    case 'accesorios':
      return <AccesoriosStep />
    case 'otros_datos':
      return <OtrosDatosStep />
    case 'evidencias':
      return <EvidenciasStep servicioId={servicioId} />
    case 'firma':
      return <FirmaStep servicioId={servicioId} />
    default:
      return <GenericChecklistStep step={step} />
  }
}

export function ServicioWizardShell({ servicioId }) {
  const [params, setParams] = useSearchParams()
  const raw = parseInt(params.get('step') ?? '0', 10)
  const stepIndex = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), CHECKLIST_STEPS.length - 1) : 0
  const step = CHECKLIST_STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === CHECKLIST_STEPS.length - 1

  function goTo(i) {
    const clamped = Math.min(Math.max(i, 0), CHECKLIST_STEPS.length - 1)
    setParams({ step: String(clamped) }, { replace: true })
  }

  return (
    <>
      <div className="wizard-progress">
        {CHECKLIST_STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            aria-label={s.label}
            title={s.label}
            onClick={() => goTo(i)}
            className={`wizard-progress-dot ${i === stepIndex ? 'is-active' : i < stepIndex ? 'is-done' : ''}`}
            style={{ border: 'none', padding: 0, cursor: 'pointer' }}
          />
        ))}
      </div>

      <div className="container">
        <div className="wizard-step-title">
          {stepIndex + 1}. {step.label}
        </div>
        <div className="wizard-step-sub">
          Paso {stepIndex + 1} de {CHECKLIST_STEPS.length} — nada aquí es obligatorio, puedes dejarlo en blanco.
        </div>

        {renderStep(step, servicioId)}
      </div>

      {step.key !== 'firma' && (
        <div className="wizard-nav">
          <button type="button" className="btn" onClick={() => goTo(stepIndex - 1)} disabled={isFirst}>
            Atrás
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn-primary" onClick={() => goTo(stepIndex + 1)} disabled={isLast}>
            Siguiente
          </button>
        </div>
      )}
    </>
  )
}
