import axios from 'axios'

// Use this everywhere instead of plain axios:
//   import api from '../api'
//   const res = await api.get('/events')      -> calls /api/events
const api = axios.create({ baseURL: '/api' })

// Automatically send the login token with every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Get the error message from our API ({ "error": "..." }), with a fallback.
//   catch (err) { setError(getErrorMessage(err)) }
export function getErrorMessage(err) {
  return err.response?.data?.error || 'Something went wrong. Please try again.'
}

export default api
