import { useEffect, useState } from 'react'
import { ChecklistField } from './ChecklistField'
import { CHECKLIST_STEPS, OTROS_DATOS_GROUPS } from '../wizard/fieldsConfig'
import { getSignedUrl } from '../lib/storage'
import { TIPO_SERVICIO_LABEL } from '../lib/estado'

const TIPO_UNIDAD_LABEL = {
  particular: 'Particular',
  transporte: 'Transporte',
  carga: 'Carga',
  maquinaria: 'Maquinaria',
}

function DatoRow({ label, value }) {
  return (
    <div className="row-between" style={{ padding: '6px 4px', borderBottom: '1px solid var(--border)' }}>
      <span className="muted text-sm">{label}</span>
      <strong>{value || value === 0 ? value : '—'}</strong>
    </div>
  )
}

function FirmaImg({ path }) {
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
      alt="Firma del técnico"
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
      {url ? (
        <img src={url} alt={foto.etiqueta} />
      ) : (
        <span className="foto-slot-label">{foto.storage_path ? 'Cargando…' : foto.etiqueta}</span>
      )}
    </div>
  )
}

/** Resumen de solo lectura de un servicio completo. Lo usan tanto la revisión
 * del admin como la vista del técnico una vez que el servicio ya se cerró. */
export function ServicioResumen({ servicio }) {
  const tipoUnidad =
    servicio.tipo_unidad === 'otra'
      ? servicio.tipo_unidad_otra || 'Otra'
      : TIPO_UNIDAD_LABEL[servicio.tipo_unidad] ?? '—'

  const accesoriosMarcados = (servicio.accesorios_instalados ?? []).filter((a) => a.checked)

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
      </div>

      {CHECKLIST_STEPS.filter((s) => s.fields).map((step) => (
        <div className="panel" key={step.key}>
          <h2>{step.label}</h2>
          {step.fields.map((field) => (
            <ChecklistField
              key={field.key}
              field={field}
              value={(servicio[step.table] ?? {})[field.key]}
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
                value={(servicio.otros_datos ?? {})[field.key]}
                readOnly
              />
            ))}
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>Evidencias fotográficas</h2>
        <div className="foto-grid">
          {(servicio.fotos ?? []).map((f) => (
            <FotoThumb key={f.id} foto={f} />
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Firma del técnico</h2>
        <FirmaImg path={servicio.firma_tecnico_storage_path} />
        <p className="text-sm muted">{servicio.firma_tecnico_nombre}</p>
      </div>
    </div>
  )
}
