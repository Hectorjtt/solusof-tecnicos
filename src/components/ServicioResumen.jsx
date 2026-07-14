import { useEffect, useState } from 'react'
import { ChecklistField } from './ChecklistField'
import { FotoSlot } from './FotoSlot'
import { CHECKLIST_STEPS, OTROS_DATOS_GROUPS } from '../wizard/fieldsConfig'
import { getSignedUrl } from '../lib/storage'
import { TIPO_SERVICIO_LABEL } from '../lib/estado'
import { useServicioWizard } from '../wizard/ServicioWizardContext'
import { GenericChecklistStep } from '../wizard/steps/GenericChecklistStep'
import { AccesoriosStep } from '../wizard/steps/AccesoriosStep'
import { OtrosDatosStep } from '../wizard/steps/OtrosDatosStep'

const TIPO_UNIDAD_LABEL = {
  particular: 'Particular',
  transporte: 'Transporte',
  carga: 'Carga',
  maquinaria: 'Maquinaria',
}

function formatFecha(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

function DatoRow({ label, value }) {
  return (
    <div className="row-between" style={{ padding: '6px 4px', borderBottom: '1px solid var(--border)' }}>
      <span className="muted text-sm">{label}</span>
      <strong>{value || value === 0 ? value : '—'}</strong>
    </div>
  )
}

function FirmaImg({ path, alt }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let active = true
    if (path) getSignedUrl(path).then((u) => active && setUrl(u))
    return () => {
      active = false
    }
  }, [path])
  if (!path) return <p className="muted">Sin firma.</p>
  if (!url) return <div className="spinner" />
  return (
    <img
      src={url}
      alt={alt}
      style={{ maxWidth: 320, border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }}
    />
  )
}

function FotoThumb({ foto }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let active = true
    if (foto.storage_path) getSignedUrl(foto.storage_path).then((u) => active && setUrl(u))
    return () => {
      active = false
    }
  }, [foto.storage_path])
  return (
    <div className="foto-slot has-photo" style={{ cursor: 'default' }}>
      <div className="foto-slot-media">
        {url ? (
          <img src={url} alt={foto.etiqueta} />
        ) : (
          <span className="foto-slot-label">{foto.storage_path ? 'Cargando…' : 'Sin foto'}</span>
        )}
      </div>
      <span className="foto-slot-caption">{foto.etiqueta}</span>
    </div>
  )
}

/** Checklist editable para la revisión del admin: reusa los mismos pasos del
 * wizard del técnico (y su autoguardado ya probado) en vez de duplicar lógica. */
function ChecklistEditable() {
  return (
    <>
      {CHECKLIST_STEPS.filter((s) => s.fields).map((step) => (
        <div key={step.key}>
          <div className="wizard-step-title">{step.label}</div>
          <GenericChecklistStep step={step} />
        </div>
      ))}
      <div className="wizard-step-title">Accesorios instalados</div>
      <AccesoriosStep />
      <OtrosDatosStep />
    </>
  )
}

/** Resumen de un servicio completo. Lo usan tanto la revisión del admin como
 * la vista del técnico una vez que el servicio ya se cerró. Siempre se monta
 * dentro de un <ServicioWizardProvider> (el mismo que usa el wizard del
 * técnico), así que checklist/accesorios/fotos vienen del contexto en vivo
 * (con realtime) en vez de una copia que se puede desactualizar.
 *
 * `checklistEditable` (solo admin, mientras el servicio está "finalizado")
 * permite corregir checklist/accesorios/otros datos antes de aprobar.
 * `fotosEditable` (solo técnico, servicio no en estado terminal) permite
 * repetir una foto mal tomada. */
export function ServicioResumen({ checklistEditable = false, fotosEditable = false }) {
  const { servicio, childData, accesorios, fotos } = useServicioWizard()

  if (!servicio) return null

  const tipoUnidad =
    servicio.tipo_unidad === 'otra'
      ? servicio.tipo_unidad_otra || 'Otra'
      : TIPO_UNIDAD_LABEL[servicio.tipo_unidad] ?? '—'

  const accesoriosMarcados = (accesorios ?? []).filter((a) => a.checked)

  return (
    <div className="stack">
      {servicio.tipo_servicio && (
        <div className="panel">
          <DatoRow label="Tipo de servicio" value={TIPO_SERVICIO_LABEL[servicio.tipo_servicio]} />
        </div>
      )}

      <div className="panel">
        <h2>Datos del cliente</h2>
        <DatoRow label="Cliente" value={servicio.cliente_nombre} />
        <DatoRow label="Teléfono" value={servicio.cliente_telefono} />
        <DatoRow label="Correo electrónico" value={servicio.cliente_correo} />
        <DatoRow label="Dirección" value={servicio.cliente_direccion} />
      </div>

      <div className="panel">
        <h2>Datos del vehículo / unidad</h2>
        <DatoRow label="Unidad / Razón social" value={servicio.unidad_razon_social} />
        <DatoRow label="Marca" value={servicio.marca} />
        <DatoRow label="Modelo" value={servicio.modelo} />
        <DatoRow label="Año" value={servicio.anio} />
        <DatoRow label="Placas" value={servicio.placas} />
        <DatoRow label="Color" value={servicio.color} />
        <DatoRow label="VIN / Serie" value={servicio.vin_serie} />
        <DatoRow label="Tipo de unidad" value={tipoUnidad} />
        <DatoRow label="Kilometraje" value={servicio.kilometraje} />
        <DatoRow label="IMEI del GPS" value={servicio.imei_gps} />
        <DatoRow label="No. de serie del GPS" value={servicio.gps_serie} />
        <DatoRow label="Tipo de GPS" value={servicio.gps_tipo} />
        <DatoRow label="Técnico instalador" value={servicio.tecnico?.nombre} />
        <DatoRow label="Inicio del servicio" value={formatFecha(servicio.iniciado_en)} />
        <DatoRow label="Fin del servicio" value={formatFecha(servicio.finalizado_en)} />
      </div>

      {checklistEditable ? (
        <ChecklistEditable />
      ) : (
        <>
          {CHECKLIST_STEPS.filter((s) => s.fields).map((step) => (
            <div className="panel" key={step.key}>
              <h2>{step.label}</h2>
              {step.fields.map((field) => (
                <ChecklistField
                  key={field.key}
                  field={field}
                  value={(childData[step.table] ?? {})[field.key]}
                  readOnly
                />
              ))}
            </div>
          ))}

          <div className="panel">
            <h2>Accesorios instalados</h2>
            {accesoriosMarcados.length === 0 && <p className="muted">Ninguno marcado.</p>}
            {accesoriosMarcados.map((a) => (
              <div className="checklist-item" key={a.id}>
                <span aria-hidden style={{ width: 22, flexShrink: 0 }}>
                  ✅
                </span>
                <label>{a.etiqueta || a.accesorio_key}</label>
              </div>
            ))}
          </div>

          <div className="panel">
            <h2>Otros datos</h2>
            {OTROS_DATOS_GROUPS.map((group) => (
              <div key={group.title} style={{ marginBottom: 14 }}>
                {group.title !== 'Anomalías / Observaciones' && (
                  <h3 style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {group.title}
                  </h3>
                )}
                {group.fields.map((field) => (
                  <ChecklistField
                    key={field.key}
                    field={field}
                    value={(childData.otros_datos ?? {})[field.key]}
                    readOnly
                  />
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="panel">
        <h2>Evidencias fotográficas</h2>
        {fotosEditable && (
          <p className="text-sm muted" style={{ marginTop: 0 }}>
            Puedes repetir cualquier foto que haya quedado mal.
          </p>
        )}
        <div className="foto-grid">
          {(fotos ?? []).map((f) =>
            fotosEditable ? (
              <FotoSlot key={f.id} servicioId={servicio.id} foto={f} />
            ) : (
              <FotoThumb key={f.id} foto={f} />
            ),
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Firma del técnico</h2>
        <FirmaImg path={servicio.firma_tecnico_storage_path} alt="Firma del técnico" />
        <p className="text-sm muted">{servicio.firma_tecnico_nombre}</p>
      </div>

      {servicio.firma_cliente_storage_path && (
        <div className="panel">
          <h2>Firma del cliente</h2>
          <FirmaImg path={servicio.firma_cliente_storage_path} alt="Firma del cliente" />
          <p className="text-sm muted">{servicio.firma_cliente_nombre}</p>
        </div>
      )}
    </div>
  )
}
