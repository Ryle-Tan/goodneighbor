import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../api'
import './AuthPage.css'

// Where each role goes after logging in
function homeFor(user) {
  if (user.role === 'admin') return '/admin'
  if (user.role === 'organizer') return '/organizer'
  return '/explore'
}

// One page for both /login and /signup:  <AuthPage mode="login" />
export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup'
  const { user, login, register } = useAuth()
  const navigate = useNavigate()

  const [joiningAs, setJoiningAs] = useState('volunteer') // or 'organization'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already logged in? Skip this page.
  if (user && !submitting) return <Navigate to={homeFor(user)} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isSignup) {
        await register(name, email, password)
        // Everyone signs up as a volunteer. Organizations then fill in the application.
        navigate(joiningAs === 'organization' ? '/apply' : '/explore')
      } else {
        const loggedIn = await login(email, password)
        navigate(homeFor(loggedIn))
      }
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="auth">
      {/* Left: green welcome panel (hidden on small screens) */}
      <aside className="auth-side">
        <Link to="/" className="auth-logo" aria-label="GoodNeighbor home">
          <LogoIcon />
        </Link>
        <div className="auth-welcome">
          <h1>Salamat for showing up for CDO.</h1>
          <p>
            Join thousands of neighbors across Carmen, Lapasan, Macasandig, Bulua and beyond — one
            activity at a time.
          </p>
        </div>
      </aside>

      {/* Right: the form */}
      <main className="auth-main">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className={`auth-tabs ${isSignup ? 'is-signup' : ''}`}>
            <Link to="/login" className={!isSignup ? 'active' : ''}>
              Log in
            </Link>
            <Link to="/signup" className={isSignup ? 'active' : ''}>
              Sign up
            </Link>
          </div>

          {isSignup && (
            <div className="auth-signup-fields">
              <p className="auth-label">I'm joining as a...</p>
              <div className="auth-roles">
                <button
                  type="button"
                  className={joiningAs === 'volunteer' ? 'active' : ''}
                  onClick={() => setJoiningAs('volunteer')}
                >
                  <PersonIcon /> Volunteer
                </button>
                <button
                  type="button"
                  className={joiningAs === 'organization' ? 'active' : ''}
                  onClick={() => setJoiningAs('organization')}
                >
                  <BuildingIcon /> Organization
                </button>
              </div>
              {joiningAs === 'organization' && (
                <p className="auth-hint">
                  After creating your account, you'll fill in a short application. An admin will
                  verify your organization before you can post activities.
                </p>
              )}

              <label className="auth-label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                placeholder="Juan dela Cruz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}

          <label className="auth-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label className="auth-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            minLength={isSignup ? 8 : undefined}
            required
          />

          {/* key={error} replays the shake animation for each new error */}
          {error && (
            <p className="auth-error" key={error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
          </button>

          <p className="auth-terms">
            By continuing you agree to GoodNeighbor's Terms and Privacy Policy.
          </p>
        </form>
      </main>
    </div>
  )
}

// ---------- Small icons ----------
function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M12 2 2 10v12h20V10L12 2z" />
      <circle cx="12" cy="11" r="1.6" fill="var(--teal)" />
      <path d="M12 19s-3.5-2.1-3.5-4.2a1.9 1.9 0 0 1 3.5-1 1.9 1.9 0 0 1 3.5 1C15.5 16.9 12 19 12 19z" fill="var(--teal)" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 21V9l9-6 9 6v12" />
      <path d="M9 21v-6h6v6" />
    </svg>
  )
}
