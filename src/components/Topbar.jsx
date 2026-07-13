import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Topbar({ title, backTo }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <img src="/img/logo-solusof.png" alt="Solusof" />
        <span>{title ?? 'Solusof Técnicos'}</span>
      </div>
      <div className="topbar-user">
        {backTo && (
          <button className="btn btn-ghost" onClick={() => navigate(backTo)}>
            Volver
          </button>
        )}
        <span>{profile?.nombre}</span>
        <button className="btn btn-ghost" onClick={signOut}>
          Salir
        </button>
      </div>
    </header>
  )
}
