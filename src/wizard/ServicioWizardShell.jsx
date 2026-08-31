import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getChecklistSteps } from './fieldsConfig'
import { useServicioWizard } from './ServicioWizardContext'
import { GenericChecklistStep } from './steps/GenericChecklistStep'
import { AccesoriosStep } from './steps/AccesoriosStep'
import { AccesoriosRevisadosStep } from './steps/AccesoriosRevisadosStep'
import { OtrosDatosStep } from './steps/OtrosDatosStep'
import { EvidenciasStep } from './steps/EvidenciasStep'
import { FirmaStep } from './steps/FirmaStep'

// Paso -1: los datos que ya vio el técnico antes de darle "Iniciar servicio"
// (TarjetaIniciar en ServicioWizard.jsx) - de ahí en adelante ese panel
// desaparece, así que esto le permite volver a consultarlos sin salir del
// wizard ni perder su progreso.
function DatosIniciales({ servicio }) {
  return (
    <>
      <div className="panel">
        <h2>Datos del cliente</h2>
        <p>
          <strong>{servicio.cliente_nombre}</strong>
          <br />
          {servicio.cliente_telefono}
          <br />
          {servicio.cliente_direccion}
        </p>
      </div>
      <div className="panel">
        <h2>Datos del vehículo / unidad</h2>
        <p>
          {servicio.marca} {servicio.modelo} {servicio.anio && `(${servicio.anio})`}
          <br />
          Unidad/Económico: {servicio.unidad_razon_social || '—'}
          <br />
          Placas: {servicio.placas || '—'}
          <br />
          VIN/Serie: {servicio.vin_serie || '—'}
          <br />
          IMEI del GPS: {servicio.imei_gps || '—'}
          <br />
          Modelo GPS: {servicio.gps_tipo || '—'}
        </p>
      </div>
    </>
  )
}

function renderStep(step, servicioId) {
  switch (step.key) {
    case 'accesorios':
      return <AccesoriosStep />
    case 'accesorios_revisados':
      return <AccesoriosRevisadosStep />
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
  const { servicio } = useServicioWizard()
  const steps = getChecklistSteps(servicio)
  const [params, setParams] = useSearchParams()
  const raw = parseInt(params.get('step') ?? '0', 10)
  const stepIndex = Number.isFinite(raw) ? Math.min(Math.max(raw, -1), steps.length - 1) : 0
  const step = stepIndex >= 0 ? steps[stepIndex] : null
  const isFirst = stepIndex === -1
  const isLast = stepIndex === steps.length - 1

  // Sin esto, si el técnico bajó con el scroll en un paso y luego cambia de
  // paso (Atrás/Siguiente/tocar un punto), la pantalla se queda hasta abajo
  // en vez de arrancar arriba en el paso nuevo -- pasaba mucho entrando a
  // Firma después de haber bajado en un paso anterior.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [stepIndex])

  function goTo(i) {
    const clamped = Math.min(Math.max(i, -1), steps.length - 1)
    setParams({ step: String(clamped) }, { replace: true })
  }

  return (
    <>
      <div className="wizard-progress">
        <button
          type="button"
          aria-label="Datos del servicio"
          title="Datos del servicio"
          onClick={() => goTo(-1)}
          className={`wizard-progress-dot ${stepIndex === -1 ? 'is-active' : 'is-done'}`}
          style={{ border: 'none', padding: 0, cursor: 'pointer' }}
        />
        {steps.map((s, i) => (
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

      {stepIndex === -1 ? (
        <div className="container">
          <div className="wizard-step-title">Datos del servicio</div>
          <div className="wizard-step-sub">Cliente, vehículo y unidad — capturados antes de iniciar.</div>
          <DatosIniciales servicio={servicio} />
        </div>
      ) : (
        <div className="container">
          <div className="wizard-step-title">
            {stepIndex + 1}. {step.label}
          </div>
          <div className="wizard-step-sub">
            Paso {stepIndex + 1} de {steps.length}
            {step.key === 'evidencias'
              ? ' — todas las fotos son obligatorias para poder finalizar.'
              : ' — nada aquí es obligatorio, puedes dejarlo en blanco.'}
          </div>

          {renderStep(step, servicioId)}
        </div>
      )}

      <div className="wizard-nav">
        <button type="button" className="btn" onClick={() => goTo(stepIndex - 1)} disabled={isFirst}>
          Atrás
        </button>
        <span className="spacer" />
        {step?.key !== 'firma' && (
          <button type="button" className="btn btn-primary" onClick={() => goTo(stepIndex + 1)} disabled={isLast}>
            Siguiente
          </button>
        )}
      </div>
    </>
  )
}
