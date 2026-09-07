import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { ServicioCard } from '../../components/ServicioCard'
import { listServicios, ocultarServicio, restaurarServicio } from '../../lib/servicios'
import { STATUS_LABEL, STATUS_LIST, dayKey } from '../../lib/estado'
import { useAuth } from '../../auth/AuthContext'

// Quiénes pueden "eliminar" (ocultar) un servicio y ver/restaurar los ya
// ocultos -- lista fija por nombre, igual que PUEDEN_EDITAR_APROBADOS en
// AdminServicioDetalle.jsx.
const PUEDEN_ELIMINAR = ['hector', 'hector tamez', 'raul ornelas']
function puedeEliminar(nombre) {
  return PUEDEN_ELIMINAR.includes((nombre || '').trim().toLowerCase())
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [verEliminados, setVerEliminados] = useState(false)

  const permisoEliminar = puedeEliminar(profile?.nombre)

  async function cargar(mostrarEliminados = verEliminados) {
    setLoading(true)
    try {
      const data = await listServicios({ oculto: mostrarEliminados })
      setServicios(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar(verEliminados)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verEliminados])

  async function handleEliminar(servicio) {
    if (!window.confirm(`¿Ocultar el servicio de "${servicio.cliente_nombre}"? No se borra, se puede recuperar después.`)) return
    await ocultarServicio(servicio.id)
    setServicios((prev) => prev.filter((s) => s.id !== servicio.id))
  }

  async function handleRestaurar(servicio) {
    await restaurarServicio(servicio.id)
    setServicios((prev) => prev.filter((s) => s.id !== servicio.id))
  }

  const filtrados = useMemo(() => {
    let list = servicios
    if (!verEliminados && tab !== 'todos') list = list.filter((s) => s.status === tab)
    const q = busqueda.trim().toLowerCase()
    if (q) {
      list = list.filter((s) =>
        [s.cliente_nombre, s.placas, s.marca, s.modelo, s.tecnico?.nombre]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q)),
      )
    }
    return list
  }, [servicios, tab, busqueda, verEliminados])

  // Vista principal: agrupado por Hoy / Próximos / Pasados (por
  // fecha_programada) en vez de una lista plana -- así se ve de un vistazo
  // qué toca hoy sin tener que entrar al calendario. Los eliminados se ven
  // como lista plana, sin agrupar (es una vista de mantenimiento, no de
  // agenda).
  const grupos = useMemo(() => {
    if (verEliminados) return null
    const hoyKey = dayKey(new Date())
    const hoy = []
    const proximos = []
    const pasados = []
    const sinFecha = []
    for (const s of filtrados) {
      if (!s.fecha_programada) {
        sinFecha.push(s)
        continue
      }
      const k = dayKey(new Date(s.fecha_programada))
      if (k === hoyKey) hoy.push(s)
      else if (k > hoyKey) proximos.push(s)
      else pasados.push(s)
    }
    hoy.sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada))
    proximos.sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada))
    pasados.sort((a, b) => new Date(b.fecha_programada) - new Date(a.fecha_programada))
    return [
      { titulo: 'Hoy', lista: hoy },
      { titulo: 'Próximos', lista: proximos },
      { titulo: 'Pasados', lista: pasados },
      { titulo: 'Sin fecha programada', lista: sinFecha },
    ].filter((g) => g.lista.length > 0)
  }, [filtrados, verEliminados])

  return (
    <div className="app-shell">
      <Topbar title="Servicios" />
      <div className="container container-wide">
        <div className="row-between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <input
            type="text"
            placeholder="Buscar por cliente, placas, técnico…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ minHeight: 44, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, flex: '1 1 220px' }}
          />
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn" onClick={() => navigate('/admin/agenda')}>
              Agenda
            </button>
            <button type="button" className="btn" onClick={() => navigate('/admin/usuarios')}>
              Usuarios
            </button>
            {permisoEliminar && (
              <button
                type="button"
                className={`btn ${verEliminados ? 'btn-primary' : ''}`}
                onClick={() => setVerEliminados((v) => !v)}
              >
                {verEliminados ? 'Ver activos' : 'Ver eliminados'}
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => navigate('/admin/servicios/nuevo')}>
              + Nuevo servicio
            </button>
          </div>
        </div>

        {!verEliminados && (
          <div className="tabs">
            <button type="button" className={`tab ${tab === 'todos' ? 'is-active' : ''}`} onClick={() => setTab('todos')}>
              Todos
            </button>
            {STATUS_LIST.map((s) => (
              <button key={s} type="button" className={`tab ${tab === s ? 'is-active' : ''}`} onClick={() => setTab(s)}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="center-screen">
            <div className="spinner" />
          </div>
        ) : verEliminados ? (
          filtrados.length === 0 ? (
            <div className="empty-state">No hay servicios eliminados.</div>
          ) : (
            <div className="stack">
              {filtrados.map((s) => (
                <ServicioCard
                  key={s.id}
                  servicio={s}
                  onClick={() => navigate(`/admin/servicios/${s.id}`)}
                  onRestaurar={permisoEliminar ? handleRestaurar : undefined}
                />
              ))}
            </div>
          )
        ) : grupos.length === 0 ? (
          <div className="empty-state">No hay servicios en esta vista.</div>
        ) : (
          <div className="stack" style={{ gap: 24 }}>
            {grupos.map((g) => (
              <div key={g.titulo}>
                <h2
                  style={{
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--muted)',
                    margin: '0 0 10px',
                  }}
                >
                  {g.titulo} <span style={{ fontWeight: 400 }}>({g.lista.length})</span>
                </h2>
                <div className="stack">
                  {g.lista.map((s) => (
                    <ServicioCard
                      key={s.id}
                      servicio={s}
                      onClick={() => navigate(`/admin/servicios/${s.id}`)}
                      onEliminar={permisoEliminar ? handleEliminar : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
