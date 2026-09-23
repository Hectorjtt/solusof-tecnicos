import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { AutocompleteInput } from '../../components/AutocompleteInput'
import { MultiEmailInput } from '../../components/MultiEmailInput'
import { useAuth } from '../../auth/AuthContext'
import { crearServicio, listTecnicos, sincronizarServicioConOS, buscarCorreosClientes } from '../../lib/servicios'
import { listarClientesWialon } from '../../lib/wialon'
import { MODELOS_GPS, TIPOS_PAQUETE, CAUSAS_REV, CAUSAS_DES, COORDINO_OPCIONES } from '../../lib/estado'

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
  { value: 'desinstalacion_instalacion', label: 'Desinstalación e Instalación' },
]

const initialForm = {
  fecha_programada: '',
  tipo_servicio: '',
  tipo_paquete: '',
  tipo_paquete_otro: '',
  causa_rev: '',
  causa_des: '',
  cliente_nombre: '',
  cliente_telefono: '',
  cliente_correos: [''],
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
  imei_gps: '',
  imei_gps_desinstalacion: '',
  gps_tipo: '',
  coordino: '',
  tecnico_id: '',
}

export default function NuevoServicioForm() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [tecnicos, setTecnicos] = useState([])
  const [clientesWialon, setClientesWialon] = useState([])
  const [correosClientes, setCorreosClientes] = useState(new Map())
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listTecnicos()
      .then(setTecnicos)
      .catch(() => setTecnicos([]))
    listarClientesWialon().then(setClientesWialon)
    buscarCorreosClientes()
      .then(setCorreosClientes)
      .catch(() => setCorreosClientes(new Map()))
  }, [])

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  // Al escribir/elegir un cliente que ya se había registrado antes (con
  // uno o varios correos capturados), autocompleta "Correo electrónico" con
  // TODOS los que ya se le conocen -- solo si los campos siguen vacíos, para
  // no pisar correos distintos que ya hayan puesto a mano.
  function onChangeClienteNombre(valor) {
    setForm((f) => {
      const correosConocidos = correosClientes.get(valor.trim().toLowerCase())
      const siguiente = { ...f, cliente_nombre: valor }
      const camposVacios = f.cliente_correos.every((c) => !c.trim())
      if (correosConocidos?.length && camposVacios) siguiente.cliente_correos = correosConocidos
      return siguiente
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.fecha_programada) {
      setError('Selecciona el día y hora en que se hará el servicio.')
      return
    }
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
    if (!form.tipo_paquete) {
      setError('Selecciona el tipo (Básico, PT, MDVR, etc.).')
      return
    }
    if (form.tipo_paquete === 'otro' && !form.tipo_paquete_otro.trim()) {
      setError('Especifica el tipo.')
      return
    }
    setEnviando(true)
    try {
      const payload = {
        ...form,
        fecha_programada: new Date(form.fecha_programada).toISOString(),
        tipo_unidad: form.tipo_unidad || null,
        cliente_correos: form.cliente_correos.map((c) => c.trim()).filter(Boolean),
        creado_por: profile.id,
      }
      const creado = await crearServicio(payload)
      sincronizarServicioConOS(creado.id)
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
          <h2>Servicio</h2>
          <div className="field">
            <label htmlFor="fecha_programada">Día y hora del servicio</label>
            <input
              id="fecha_programada"
              type="datetime-local"
              value={form.fecha_programada}
              onChange={set('fecha_programada')}
            />
          </div>
          <div className="radio-row" style={{ marginTop: 12 }}>
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

          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="tipo_paquete">Tipo</label>
            <select id="tipo_paquete" value={form.tipo_paquete} onChange={set('tipo_paquete')}>
              <option value="">Selecciona…</option>
              {TIPOS_PAQUETE.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {form.tipo_paquete === 'otro' && (
              <input
                type="text"
                placeholder="Especifica"
                style={{ marginTop: 8 }}
                value={form.tipo_paquete_otro}
                onChange={set('tipo_paquete_otro')}
              />
            )}
          </div>

          {(form.tipo_servicio === 'revision' || form.tipo_servicio === 'reinstalacion') && (
            <div className="field">
              <label htmlFor="causa_rev">Causa Rev</label>
              <select id="causa_rev" value={form.causa_rev} onChange={set('causa_rev')}>
                <option value="">Selecciona…</option>
                {CAUSAS_REV.map((causa) => (
                  <option key={causa} value={causa}>
                    {causa}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.tipo_servicio === 'desinstalacion' && (
            <div className="field">
              <label htmlFor="causa_des">Causa Des</label>
              <select id="causa_des" value={form.causa_des} onChange={set('causa_des')}>
                <option value="">Selecciona…</option>
                {CAUSAS_DES.map((causa) => (
                  <option key={causa} value={causa}>
                    {causa}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Datos del cliente</h2>
          <div className="field">
            <label htmlFor="cliente_nombre">Cliente</label>
            <AutocompleteInput
              id="cliente_nombre"
              required
              value={form.cliente_nombre}
              onChange={onChangeClienteNombre}
              options={clientesWialon}
            />
          </div>
          <div className="field">
            <label htmlFor="cliente_telefono">Teléfono</label>
            <input id="cliente_telefono" type="tel" value={form.cliente_telefono} onChange={set('cliente_telefono')} />
          </div>
          <div className="field">
            <label htmlFor="cliente_correo">Correo electrónico</label>
            <MultiEmailInput
              idPrefix="cliente_correo"
              value={form.cliente_correos}
              onChange={(v) => setForm((f) => ({ ...f, cliente_correos: v }))}
            />
          </div>
          <div className="field">
            <label htmlFor="cliente_direccion">Dirección</label>
            <textarea id="cliente_direccion" value={form.cliente_direccion} onChange={set('cliente_direccion')} />
          </div>
        </div>

        <div className="panel">
          <h2>Datos del vehículo / unidad</h2>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="unidad_razon_social">Unidad/Económico</label>
              <input id="unidad_razon_social" type="text" value={form.unidad_razon_social} onChange={set('unidad_razon_social')} />
            </div>
            <div className="field">
              <label htmlFor="placas">Placas</label>
              <input id="placas" type="text" value={form.placas} onChange={set('placas')} />
            </div>
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
          <div className="field">
            <label htmlFor="vin_serie">VIN / Serie</label>
            <input id="vin_serie" type="text" value={form.vin_serie} onChange={set('vin_serie')} />
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

          <div className="grid-2">
            <div className="field">
              <label htmlFor="imei_gps">IMEI del GPS</label>
              <input id="imei_gps" type="text" value={form.imei_gps} onChange={set('imei_gps')} />
            </div>
            <div className="field">
              <label htmlFor="gps_tipo">Modelo GPS</label>
              <select id="gps_tipo" value={form.gps_tipo} onChange={set('gps_tipo')}>
                <option value="">Selecciona…</option>
                {MODELOS_GPS.map((modelo) => (
                  <option key={modelo} value={modelo}>
                    {modelo}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {form.tipo_servicio === 'desinstalacion_instalacion' && (
            <div className="field">
              <label htmlFor="imei_gps_desinstalacion">IMEI a desinstalar</label>
              <input
                id="imei_gps_desinstalacion"
                type="text"
                value={form.imei_gps_desinstalacion}
                onChange={set('imei_gps_desinstalacion')}
              />
            </div>
          )}
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
          <div className="field">
            <label htmlFor="coordino">Coordinó</label>
            <select id="coordino" value={form.coordino} onChange={set('coordino')}>
              <option value="">Selecciona…</option>
              {COORDINO_OPCIONES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
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
