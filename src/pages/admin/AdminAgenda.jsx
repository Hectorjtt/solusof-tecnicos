import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { ServicioCard } from '../../components/ServicioCard'
import { listServicios } from '../../lib/servicios'
import { TIPO_SERVICIO_LABEL, dayKey } from '../../lib/estado'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Genera las celdas del mes (incluye días del mes anterior/siguiente para
// completar semanas de 7, igual que un calendario tipo Apple/Google).
function getMonthGrid(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month, -i), inMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), inMonth: true })
  }
  let next = 1
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, next), inMonth: false })
    next++
  }
  return cells
}

export default function AdminAgenda() {
  const navigate = useNavigate()
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [mesActual, setMesActual] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)

  useEffect(() => {
    listServicios()
      .then(setServicios)
      .finally(() => setLoading(false))
  }, [])

  const serviciosPorDia = useMemo(() => {
    const map = {}
    for (const s of servicios) {
      if (!s.fecha_programada) continue
      const k = dayKey(new Date(s.fecha_programada))
      if (!map[k]) map[k] = []
      map[k].push(s)
    }
    for (const lista of Object.values(map)) {
      lista.sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada))
    }
    return map
  }, [servicios])

  const celdas = useMemo(() => getMonthGrid(mesActual), [mesActual])
  const hoyKey = dayKey(new Date())

  function cambiarMes(delta) {
    setMesActual((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
    setDiaSeleccionado(null)
  }

  const serviciosDelDiaSeleccionado = diaSeleccionado ? serviciosPorDia[diaSeleccionado] ?? [] : []

  return (
    <div className="app-shell">
      <Topbar title="Agenda" />
      <div className="container container-wide">
        <div className="row-between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn-icon" aria-label="Mes anterior" onClick={() => cambiarMes(-1)}>
              ‹
            </button>
            <strong style={{ minWidth: 160, textAlign: 'center' }}>
              {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
            </strong>
            <button type="button" className="btn-icon" aria-label="Mes siguiente" onClick={() => cambiarMes(1)}>
              ›
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const d = new Date()
                setMesActual(new Date(d.getFullYear(), d.getMonth(), 1))
                setDiaSeleccionado(null)
              }}
            >
              Hoy
            </button>
          </div>
          <button type="button" className="btn" onClick={() => navigate('/admin')}>
            Volver
          </button>
        </div>

        {loading ? (
          <div className="center-screen">
            <div className="spinner" />
          </div>
        ) : (
          <>
            <div className="calendar-grid">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="calendar-weekday">
                  {d}
                </div>
              ))}
              {celdas.map(({ date, inMonth }) => {
                const k = dayKey(date)
                const serviciosDia = serviciosPorDia[k] ?? []
                const esHoy = k === hoyKey
                const visibles = serviciosDia.slice(0, 3)
                const restantes = serviciosDia.length - visibles.length
                return (
                  <button
                    type="button"
                    key={k}
                    className={`calendar-cell ${inMonth ? '' : 'is-outside'} ${esHoy ? 'is-today' : ''} ${diaSeleccionado === k ? 'is-selected' : ''}`}
                    onClick={() => setDiaSeleccionado(k === diaSeleccionado ? null : k)}
                  >
                    <span className="calendar-cell-day">{date.getDate()}</span>
                    <div className="calendar-cell-chips">
                      {visibles.map((s) => (
                        <span
                          key={s.id}
                          className="calendar-chip"
                          title={`${s.cliente_nombre} — ${TIPO_SERVICIO_LABEL[s.tipo_servicio] ?? ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/admin/servicios/${s.id}`)
                          }}
                        >
                          {s.cliente_nombre}
                        </span>
                      ))}
                      {restantes > 0 && <span className="calendar-chip-mas">+{restantes} más</span>}
                    </div>
                  </button>
                )
              })}
            </div>

            {diaSeleccionado && (
              <div className="panel" style={{ marginTop: 16 }}>
                <h2>
                  {new Date(diaSeleccionado + 'T00:00:00').toLocaleDateString('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h2>
                {serviciosDelDiaSeleccionado.length === 0 ? (
                  <p className="muted">Sin servicios programados este día.</p>
                ) : (
                  <div className="stack">
                    {serviciosDelDiaSeleccionado.map((s) => (
                      <ServicioCard key={s.id} servicio={s} onClick={() => navigate(`/admin/servicios/${s.id}`)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
