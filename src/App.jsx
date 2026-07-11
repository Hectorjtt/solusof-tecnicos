import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { RealtimeProvider } from './auth/RealtimeProvider'
import LoginScreen from './pages/LoginScreen'
import AdminDashboard from './pages/admin/AdminDashboard'
import NuevoServicioForm from './pages/admin/NuevoServicioForm'
import AdminServicioDetalle from './pages/admin/AdminServicioDetalle'
import GestionUsuarios from './pages/admin/GestionUsuarios'
import TecnicoDashboard from './pages/tecnico/TecnicoDashboard'
import ServicioWizard from './pages/tecnico/ServicioWizard'

function HomeRedirect() {
  const { session, role, loading } = useAuth()
  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={role === 'admin' ? '/admin' : '/tecnico'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <Routes>
            <Route path="/login" element={<LoginScreen />} />

            <Route
              path="/admin"
              element={
                <RequireAuth role="admin">
                  <AdminDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/servicios/nuevo"
              element={
                <RequireAuth role="admin">
                  <NuevoServicioForm />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/servicios/:id"
              element={
                <RequireAuth role="admin">
                  <AdminServicioDetalle />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <RequireAuth role="admin">
                  <GestionUsuarios />
                </RequireAuth>
              }
            />

            <Route
              path="/tecnico"
              element={
                <RequireAuth role="tecnico">
                  <TecnicoDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/tecnico/servicios/:id"
              element={
                <RequireAuth role="tecnico">
                  <ServicioWizard />
                </RequireAuth>
              }
            />

            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
