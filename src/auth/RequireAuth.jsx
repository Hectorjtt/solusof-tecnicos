import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

const HOME_BY_ROLE = {
  admin: '/admin',
  tecnico: '/tecnico',
}

/** Protege una ruta: exige sesión y, opcionalmente, un rol específico. */
export function RequireAuth({ role, children }) {
  const { session, role: myRole, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (role && myRole && myRole !== role) {
    return <Navigate to={HOME_BY_ROLE[myRole] ?? '/login'} replace />
  }

  return children
}
