import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const AuthContext = createContext(null)

// Wrap the app in <AuthProvider> (done in main.jsx).
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // true while we check a saved token on page load
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')))

  // On page load: if a token is saved, ask the server who we are.
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('token')) // expired or invalid
      .finally(() => setLoading(false))
  }, [])

  function saveLogin(data) {
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data.user
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    return saveLogin(res.data)
  }

  async function register(name, email, password) {
    const res = await api.post('/auth/register', { name, email, password })
    return saveLogin(res.data)
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// In any component:  const { user, login, logout } = useAuth()
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
