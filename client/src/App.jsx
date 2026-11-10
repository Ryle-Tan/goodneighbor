import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Placeholder from './components/Placeholder'

// Each person adds or replaces routes ONLY inside their own section.
// Swap <Placeholder ... /> for your real page when it's ready.

export default function App() {
  return (
    <Routes>
      {/* --- TAMPUS: public pages --- */}
      <Route path="/" element={<Placeholder name="Landing" owner="TAMPUS" />} />
      <Route path="/explore" element={<Placeholder name="Explore" owner="TAMPUS" />} />
      <Route path="/activities/:id" element={<Placeholder name="Activity Details" owner="TAMPUS" />} />
      <Route path="/organizations/:id" element={<Placeholder name="Organization" owner="TAMPUS" />} />

      {/* --- TAN: auth --- */}
      <Route path="/login" element={<Placeholder name="Log in" owner="TAN" />} />
      <Route path="/signup" element={<Placeholder name="Sign up" owner="TAN" />} />

      {/* Logged-in users only */}
      <Route element={<ProtectedRoute />}>
        {/* --- TAN --- */}
        <Route path="/apply" element={<Placeholder name="Apply as organizer" owner="TAN" />} />

        {/* --- LIM: volunteer --- */}
        <Route path="/my-activities" element={<Placeholder name="My Activities" owner="LIM" />} />
        <Route path="/impact" element={<Placeholder name="Impact" owner="LIM" />} />
        <Route path="/profile" element={<Placeholder name="Profile" owner="LIM" />} />
      </Route>

      {/* --- BARNEDO: organizer only --- */}
      <Route element={<ProtectedRoute roles={['organizer']} />}>
        <Route path="/organizer" element={<Placeholder name="Organizer Overview" owner="BARNEDO" />} />
        <Route path="/organizer/activities/new" element={<Placeholder name="Create Activity" owner="BARNEDO" />} />
        <Route path="/organizer/activities/:id/edit" element={<Placeholder name="Edit Activity" owner="BARNEDO" />} />
        <Route path="/organizer/activities/:id" element={<Placeholder name="Manage Activity" owner="BARNEDO" />} />
      </Route>

      {/* --- TAN: admin only --- */}
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin" element={<Placeholder name="Admin Overview" owner="TAN" />} />
        <Route path="/admin/manage" element={<Placeholder name="Admin Manage" owner="TAN + BARNEDO" />} />
      </Route>

      {/* Unknown URL -> home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
