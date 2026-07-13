import { useAuth } from '../auth/AuthContext'

export function Topbar({ title }) {
  const { profile, signOut } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <img src="/img/logo-solusof.png" alt="Solusof" />
        <span>{title ?? 'Solusof Técnicos'}</span>
      </div>
      <div className="topbar-user">
        <span>{profile?.nombre}</span>
        <button className="btn btn-ghost" onClick={signOut}>
          Salir
        </button>
      </div>
    </header>
  )
}
