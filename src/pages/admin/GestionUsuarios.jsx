import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { supabase } from '../../lib/supabaseClient'

const initialForm = { nombre: '', email: '', telefono: '', password: '', role: 'tecnico' }

export default function GestionUsuarios() {
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(initialForm)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('role').order('nombre')
    setUsuarios(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function crear(e) {
    e.preventDefault()
    setError('')
    setOk('')
    setCreando(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-technician', {
        body: form,
      })
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)
      setOk(`Cuenta creada para ${form.nombre}. Comparte la contraseña por WhatsApp.`)
      setForm(initialForm)
      cargar()
    } catch (err) {
      setError(err.message ?? 'No se pudo crear la cuenta.')
    } finally {
      setCreando(false)
    }
  }

  async function toggleActivo(usuario) {
    await supabase.from('profiles').update({ activo: !usuario.activo }).eq('id', usuario.id)
    cargar()
  }

  return (
    <div className="app-shell">
      <Topbar title="Usuarios" />
      <div className="container">
        <div className="panel row-between">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/admin')}>
            Volver
          </button>
          <span className="muted text-sm">Alta y gestión de cuentas de técnicos y admins</span>
        </div>

        <div className="panel">
          <h2>Nueva cuenta</h2>
          <form onSubmit={crear}>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="nombre">Nombre</label>
                <input id="nombre" type="text" required value={form.nombre} onChange={set('nombre')} />
              </div>
              <div className="field">
                <label htmlFor="telefono">Teléfono</label>
                <input id="telefono" type="tel" value={form.telefono} onChange={set('telefono')} />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="email">Correo electrónico</label>
                <input id="email" type="email" required value={form.email} onChange={set('email')} />
              </div>
              <div className="field">
                <label htmlFor="password">Contraseña temporal</label>
                <input id="password" type="text" required minLength={6} value={form.password} onChange={set('password')} />
              </div>
            </div>
            <div className="field">
              <label>Rol</label>
              <div className="radio-row">
                <label>
                  <input type="radio" name="role" value="tecnico" checked={form.role === 'tecnico'} onChange={set('role')} />
                  Técnico
                </label>
                <label>
                  <input type="radio" name="role" value="admin" checked={form.role === 'admin'} onChange={set('role')} />
                  Admin
                </label>
              </div>
            </div>
            {error && <p className="field-error">{error}</p>}
            {ok && <p className="text-sm" style={{ color: 'var(--ok)' }}>{ok}</p>}
            <button type="submit" className="btn btn-primary" disabled={creando}>
              {creando ? 'Creando…' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <div className="panel">
          <h2>Cuentas existentes</h2>
          {loading ? (
            <div className="spinner" />
          ) : (
            usuarios.map((u) => (
              <div key={u.id} className="row-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <strong>{u.nombre}</strong>{' '}
                  <span className="muted text-sm">
                    · {u.role === 'admin' ? 'Admin' : 'Técnico'}
                    {u.telefono ? ` · ${u.telefono}` : ''}
                  </span>
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => toggleActivo(u)}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
