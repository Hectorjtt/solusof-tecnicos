import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { ServicioCard } from '../../components/ServicioCard'
import { listServicios } from '../../lib/servicios'
import { STATUS_LABEL, STATUS_LIST } from '../../lib/estado'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  async function cargar() {
    setLoading(true)
    try {
      const data = await listServicios()
      setServicios(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    let list = servicios
    if (tab !== 'todos') list = list.filter((s) => s.status === tab)
    const q = busqueda.trim().toLowerCase()
    if (q) {
      list = list.filter((s) =>
        [s.cliente_nombre, s.placas, s.marca, s.modelo, s.tecnico?.nombre]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q)),
      )
    }
    return list
  }, [servicios, tab, busqueda])

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
            <button type="button" className="btn" onClick={() => navigate('/admin/usuarios')}>
              Usuarios
            </button>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/admin/servicios/nuevo')}>
              + Nuevo servicio
            </button>
          </div>
        </div>

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

        {loading ? (
          <div className="center-screen">
            <div className="spinner" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state">No hay servicios en esta vista.</div>
        ) : (
          <div className="stack">
            {filtrados.map((s) => (
              <ServicioCard key={s.id} servicio={s} onClick={() => navigate(`/admin/servicios/${s.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
