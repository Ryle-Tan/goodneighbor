import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wrap routes that need login. Optionally limit to certain roles.
//   <Route element={<ProtectedRoute roles={['admin']} />}> ...admin routes... </Route>
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()

  if (loading) return null // still checking the saved token
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return <Outlet />
}
