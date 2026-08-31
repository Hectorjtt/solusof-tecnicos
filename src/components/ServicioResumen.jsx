import { useEffect, useState } from 'react'
import { ChecklistField } from './ChecklistField'
import { FotoSlot } from './FotoSlot'
import { CHECKLIST_STEPS, OTROS_DATOS_GROUPS, accesoriosLabel } from '../wizard/fieldsConfig'
import { getSignedUrl } from '../lib/storage'
import { listTecnicos } from '../lib/servicios'
import { TIPO_SERVICIO_LABEL, TIPO_PAQUETE_LABEL, TIPOS_PAQUETE, MODELOS_GPS } from '../lib/estado'
import { useServicioWizard } from '../wizard/ServicioWizardContext'
import { GenericChecklistStep } from '../wizard/steps/GenericChecklistStep'
import { AccesoriosStep } from '../wizard/steps/AccesoriosStep'
import { AccesoriosRevisadosStep } from '../wizard/steps/AccesoriosRevisadosStep'
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

/** Igual que DatoRow, pero si `editable` es true se muestra como campo de
 * captura en vez de solo lectura (usado por el admin para corregir datos del
 * cliente/vehículo mientras el servicio no esté "aprobado"). */
function DatoCampo({ label, value, editable, onChange }) {
  if (!editable) return <DatoRow label={label} value={value} />
  return (
    <div className="field">
      <label>{label}</label>
      <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

/** Igual que DatoCampo, pero como <select> con opciones fijas (ej. Modelo GPS). */
function DatoSelect({ label, value, options, editable, onChange }) {
  if (!editable) return <DatoRow label={label} value={value} />
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecciona…</option>
        {options.map((opcion) => (
          <option key={opcion} value={opcion}>
            {opcion}
          </option>
        ))}
      </select>
    </div>
  )
}

function DatoTipoUnidad({ tipoUnidad, tipoUnidadOtra, tipoUnidadLabel, editable, onChangeTipo, onChangeOtra }) {
  if (!editable) return <DatoRow label="Tipo de unidad" value={tipoUnidadLabel} />
  return (
    <div className="field">
      <label>Tipo de unidad</label>
      <div className="radio-row">
        {Object.entries(TIPO_UNIDAD_LABEL).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="tipo_unidad_resumen"
              checked={tipoUnidad === value}
              onChange={() => onChangeTipo(value)}
            />
            {label}
          </label>
        ))}
        <label>
          <input
            type="radio"
            name="tipo_unidad_resumen"
            checked={tipoUnidad === 'otra'}
            onChange={() => onChangeTipo('otra')}
          />
          Otra
        </label>
      </div>
      {tipoUnidad === 'otra' && (
        <input
          type="text"
          placeholder="Especifica"
          style={{ marginTop: 8 }}
          value={tipoUnidadOtra ?? ''}
          onChange={(e) => onChangeOtra(e.target.value)}
        />
      )}
    </div>
  )
}

function DatoTipoPaquete({ tipoPaquete, tipoPaqueteOtro, editable, onChangeTipo, onChangeOtro }) {
  const label = tipoPaquete === 'otro' ? tipoPaqueteOtro || 'Otro' : TIPO_PAQUETE_LABEL[tipoPaquete]
  if (!editable) return <DatoRow label="Tipo" value={label} />
  return (
    <div className="field">
      <label>Tipo</label>
      <select value={tipoPaquete ?? ''} onChange={(e) => onChangeTipo(e.target.value)}>
        <option value="">Selecciona…</option>
        {TIPOS_PAQUETE.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      {tipoPaquete === 'otro' && (
        <input
          type="text"
          placeholder="Especifica"
          style={{ marginTop: 8 }}
          value={tipoPaqueteOtro ?? ''}
          onChange={(e) => onChangeOtro(e.target.value)}
        />
      )}
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
  const { servicio } = useServicioWizard()
  return (
    <>
      {CHECKLIST_STEPS.filter((s) => s.fields).map((step) => (
        <div key={step.key}>
          <div className="wizard-step-title">{step.label}</div>
          <GenericChecklistStep step={step} />
        </div>
      ))}
      {servicio?.tipo_servicio === 'revision' && (
        <>
          <div className="wizard-step-title">Accesorios revisados</div>
          <AccesoriosRevisadosStep />
        </>
      )}
      <div className="wizard-step-title">{accesoriosLabel(servicio)}</div>
      <AccesoriosStep />
      <OtrosDatosStep />
    </>
  )
}

function DatoTecnico({ tecnicoId, tecnicoNombre, tecnicos, editable, onChange }) {
  if (!editable) return <DatoRow label="Técnico instalador" value={tecnicoNombre} />
  return (
    <div className="field">
      <label htmlFor="tecnico_reasignar">Técnico instalador</label>
      <select id="tecnico_reasignar" value={tecnicoId ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecciona…</option>
        {tecnicos.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre}
          </option>
        ))}
      </select>
    </div>
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
 * `fotosEditable` (solo admin, mientras el servicio no esté "aprobado")
 * permite cargar fotos de galería o quitarlas para que no salgan en el
 * reporte — el técnico ya NO puede tocar sus fotos una vez finalizado.
 * `datosEditable` (solo admin, mientras el servicio no esté "aprobado")
 * permite corregir los datos del cliente y del vehículo/unidad. */
export function ServicioResumen({ checklistEditable = false, fotosEditable = false, datosEditable = false }) {
  const { servicio, childData, accesorios, accesoriosRevisados, fotos, updateServicioField, patchServicioLocal } =
    useServicioWizard()
  const [tecnicos, setTecnicos] = useState([])

  useEffect(() => {
    if (!datosEditable) return
    listTecnicos().then(setTecnicos).catch(() => setTecnicos([]))
  }, [datosEditable])

  if (!servicio) return null

  const tipoUnidad =
    servicio.tipo_unidad === 'otra'
      ? servicio.tipo_unidad_otra || 'Otra'
      : TIPO_UNIDAD_LABEL[servicio.tipo_unidad] ?? '—'

  const accesoriosMarcados = (accesorios ?? []).filter((a) => a.checked)
  const accesoriosRevisadosMarcados = (accesoriosRevisados ?? []).filter((a) => a.checked)
  const campoServicio = (key) => (value) => updateServicioField(key, value)

  // El técnico ya asignado puede estar inactivo (o venir de un select que
  // solo trae activos) — se agrega igual a las opciones para que el select
  // siempre muestre correctamente a quién está asignado hoy.
  const tecnicosOpciones =
    servicio.tecnico && !tecnicos.some((t) => t.id === servicio.tecnico.id)
      ? [...tecnicos, servicio.tecnico].sort((a, b) => a.nombre.localeCompare(b.nombre))
      : tecnicos

  function reasignarTecnico(nuevoId) {
    const tecnico = tecnicosOpciones.find((t) => t.id === nuevoId) ?? null
    updateServicioField('tecnico_id', nuevoId || null, { immediate: true })
    patchServicioLocal({ tecnico })
  }

  return (
    <div className="stack">
      {servicio.tipo_servicio && (
        <div className="panel">
          <DatoRow label="Servicio" value={TIPO_SERVICIO_LABEL[servicio.tipo_servicio]} />
          <DatoTipoPaquete
            tipoPaquete={servicio.tipo_paquete}
            tipoPaqueteOtro={servicio.tipo_paquete_otro}
            editable={datosEditable}
            onChangeTipo={campoServicio('tipo_paquete')}
            onChangeOtro={campoServicio('tipo_paquete_otro')}
          />
        </div>
      )}

      <div className="panel">
        <h2>Datos del cliente</h2>
        <DatoCampo label="Cliente" value={servicio.cliente_nombre} editable={datosEditable} onChange={campoServicio('cliente_nombre')} />
        <DatoCampo label="Teléfono" value={servicio.cliente_telefono} editable={datosEditable} onChange={campoServicio('cliente_telefono')} />
        <DatoCampo label="Correo electrónico" value={servicio.cliente_correo} editable={datosEditable} onChange={campoServicio('cliente_correo')} />
        <DatoCampo label="Dirección" value={servicio.cliente_direccion} editable={datosEditable} onChange={campoServicio('cliente_direccion')} />
      </div>

      <div className="panel">
        <h2>Datos del vehículo / unidad</h2>
        <DatoCampo label="Unidad/Económico" value={servicio.unidad_razon_social} editable={datosEditable} onChange={campoServicio('unidad_razon_social')} />
        <DatoCampo label="Marca" value={servicio.marca} editable={datosEditable} onChange={campoServicio('marca')} />
        <DatoCampo label="Modelo" value={servicio.modelo} editable={datosEditable} onChange={campoServicio('modelo')} />
        <DatoCampo label="Año" value={servicio.anio} editable={datosEditable} onChange={campoServicio('anio')} />
        <DatoCampo label="Placas" value={servicio.placas} editable={datosEditable} onChange={campoServicio('placas')} />
        <DatoCampo label="Color" value={servicio.color} editable={datosEditable} onChange={campoServicio('color')} />
        <DatoCampo label="VIN / Serie" value={servicio.vin_serie} editable={datosEditable} onChange={campoServicio('vin_serie')} />
        <DatoTipoUnidad
          tipoUnidad={servicio.tipo_unidad}
          tipoUnidadOtra={servicio.tipo_unidad_otra}
          tipoUnidadLabel={tipoUnidad}
          editable={datosEditable}
          onChangeTipo={campoServicio('tipo_unidad')}
          onChangeOtra={campoServicio('tipo_unidad_otra')}
        />
        <DatoCampo label="IMEI del GPS" value={servicio.imei_gps} editable={datosEditable} onChange={campoServicio('imei_gps')} />
        <DatoSelect label="Modelo GPS" value={servicio.gps_tipo} options={MODELOS_GPS} editable={datosEditable} onChange={campoServicio('gps_tipo')} />
        <DatoTecnico
          tecnicoId={servicio.tecnico_id}
          tecnicoNombre={servicio.tecnico?.nombre}
          tecnicos={tecnicosOpciones}
          editable={datosEditable}
          onChange={reasignarTecnico}
        />
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

          {servicio.tipo_servicio === 'revision' && (
            <div className="panel">
              <h2>Accesorios revisados</h2>
              {accesoriosRevisadosMarcados.length === 0 && <p className="muted">Ninguno marcado.</p>}
              {accesoriosRevisadosMarcados.map((a) => (
                <div className="checklist-item" key={a.id}>
                  <span aria-hidden style={{ width: 22, flexShrink: 0 }}>
                    ✅
                  </span>
                  <label>{a.etiqueta || a.accesorio_key}</label>
                </div>
              ))}
            </div>
          )}

          <div className="panel">
            <h2>{accesoriosLabel(servicio)}</h2>
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
