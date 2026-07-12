import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { useAuth } from '../../auth/AuthContext'
import { crearServicio, listTecnicos } from '../../lib/servicios'

const TIPOS_UNIDAD = [
  { value: 'particular', label: 'Particular' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'carga', label: 'Carga' },
  { value: 'maquinaria', label: 'Maquinaria' },
  { value: 'otra', label: 'Otra' },
]

const TIPOS_SERVICIO = [
  { value: 'instalacion', label: 'Instalación' },
  { value: 'revision', label: 'Revisión' },
  { value: 'reinstalacion', label: 'Reinstalación' },
  { value: 'desinstalacion', label: 'Desinstalación' },
]

const initialForm = {
  tipo_servicio: '',
  cliente_nombre: '',
  cliente_telefono: '',
  cliente_correo: '',
  cliente_direccion: '',
  unidad_razon_social: '',
  marca: '',
  modelo: '',
  anio: '',
  placas: '',
  color: '',
  vin_serie: '',
  tipo_unidad: '',
  tipo_unidad_otra: '',
  kilometraje: '',
  imei_gps: '',
  gps_serie: '',
  gps_tipo: '',
  tecnico_id: '',
}

export default function NuevoServicioForm() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [tecnicos, setTecnicos] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listTecnicos()
      .then(setTecnicos)
      .catch(() => setTecnicos([]))
  }, [])

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.cliente_nombre.trim()) {
      setError('Falta el nombre del cliente.')
      return
    }
    if (!form.tecnico_id) {
      setError('Selecciona qué técnico hará el servicio.')
      return
    }
    if (!form.tipo_servicio) {
      setError('Selecciona el tipo de servicio.')
      return
    }
    setEnviando(true)
    try {
      const payload = {
        ...form,
        kilometraje: form.kilometraje === '' ? null : Number(form.kilometraje),
        tipo_unidad: form.tipo_unidad || null,
        creado_por: profile.id,
      }
      const creado = await crearServicio(payload)
      navigate(`/admin/servicios/${creado.id}`)
    } catch (err) {
      setError(err.message ?? 'No se pudo crear el servicio.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="app-shell">
      <Topbar title="Nuevo servicio" />
      <form className="container" style={{ maxWidth: 720 }} onSubmit={handleSubmit}>
        <div className="panel">
          <h2>Tipo de servicio</h2>
          <div className="radio-row">
            {TIPOS_SERVICIO.map((t) => (
              <label key={t.value}>
                <input
                  type="radio"
                  name="tipo_servicio"
                  value={t.value}
                  checked={form.tipo_servicio === t.value}
                  onChange={set('tipo_servicio')}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Datos del cliente</h2>
          <div className="field">
            <label htmlFor="cliente_nombre">Cliente</label>
            <input id="cliente_nombre" type="text" required value={form.cliente_nombre} onChange={set('cliente_nombre')} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="cliente_telefono">Teléfono</label>
              <input id="cliente_telefono" type="tel" value={form.cliente_telefono} onChange={set('cliente_telefono')} />
            </div>
            <div className="field">
              <label htmlFor="cliente_correo">Correo electrónico</label>
              <input id="cliente_correo" type="email" value={form.cliente_correo} onChange={set('cliente_correo')} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="cliente_direccion">Dirección</label>
            <textarea id="cliente_direccion" value={form.cliente_direccion} onChange={set('cliente_direccion')} />
          </div>
        </div>

        <div className="panel">
          <h2>Datos del vehículo / unidad</h2>
          <div className="field">
            <label htmlFor="unidad_razon_social">Unidad / Razón social</label>
            <input id="unidad_razon_social" type="text" value={form.unidad_razon_social} onChange={set('unidad_razon_social')} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="marca">Marca</label>
              <input id="marca" type="text" value={form.marca} onChange={set('marca')} />
            </div>
            <div className="field">
              <label htmlFor="modelo">Modelo</label>
              <input id="modelo" type="text" value={form.modelo} onChange={set('modelo')} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="anio">Año</label>
              <input id="anio" type="text" value={form.anio} onChange={set('anio')} />
            </div>
            <div className="field">
              <label htmlFor="color">Color</label>
              <input id="color" type="text" value={form.color} onChange={set('color')} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="placas">Placas</label>
              <input id="placas" type="text" value={form.placas} onChange={set('placas')} />
            </div>
            <div className="field">
              <label htmlFor="vin_serie">VIN / Serie</label>
              <input id="vin_serie" type="text" value={form.vin_serie} onChange={set('vin_serie')} />
            </div>
          </div>

          <div className="field">
            <label>Tipo de unidad</label>
            <div className="radio-row">
              {TIPOS_UNIDAD.map((t) => (
                <label key={t.value}>
                  <input
                    type="radio"
                    name="tipo_unidad"
                    value={t.value}
                    checked={form.tipo_unidad === t.value}
                    onChange={set('tipo_unidad')}
                  />
                  {t.label}
                </label>
              ))}
            </div>
            {form.tipo_unidad === 'otra' && (
              <input
                type="text"
                placeholder="Especifica"
                style={{ marginTop: 8 }}
                value={form.tipo_unidad_otra}
                onChange={set('tipo_unidad_otra')}
              />
            )}
          </div>

          <div className="field">
            <label htmlFor="kilometraje">Kilometraje</label>
            <input id="kilometraje" type="number" inputMode="numeric" value={form.kilometraje} onChange={set('kilometraje')} />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="imei_gps">IMEI del GPS</label>
              <input id="imei_gps" type="text" value={form.imei_gps} onChange={set('imei_gps')} />
            </div>
            <div className="field">
              <label htmlFor="gps_serie">No. de serie del GPS</label>
              <input id="gps_serie" type="text" value={form.gps_serie} onChange={set('gps_serie')} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="gps_tipo">Tipo de GPS</label>
              <input id="gps_tipo" type="text" value={form.gps_tipo} onChange={set('gps_tipo')} />
            </div>
            <div className="field">
              <label htmlFor="tecnico_id">Técnico instalador</label>
              <select id="tecnico_id" required value={form.tecnico_id} onChange={set('tecnico_id')}>
                <option value="">Selecciona…</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
              {tecnicos.length === 0 && (
                <p className="field-hint">
                  No hay técnicos activos todavía — créalos en "Usuarios".
                </p>
              )}
            </div>
          </div>
        </div>

        {error && <p className="field-error">{error}</p>}

        <div className="row">
          <button type="button" className="btn" onClick={() => navigate('/admin')} disabled={enviando}>
            Cancelar
          </button>
          <span className="spacer" />
          <button type="submit" className="btn btn-primary btn-lg" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar servicio al técnico'}
          </button>
        </div>
      </form>
    </div>
  )
}
