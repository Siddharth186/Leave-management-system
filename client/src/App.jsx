import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Common/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ApplyLeave } from './pages/ApplyLeave';
import { LeaveHistory } from './pages/LeaveHistory';
import { ManagerApproval } from './pages/ManagerApproval';
import { Profile } from './pages/Profile';

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Redirects unauthenticated users to /login.
// Layout already handles this too, but having it here keeps route config explicit.
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

// ─── GuestRoute ───────────────────────────────────────────────────────────────
// Redirects already-authenticated users away from /login and /register.
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes — redirect to dashboard if already logged in */}
          <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          {/* Protected routes — all under shared Layout */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"  element={<Dashboard />} />
            <Route path="apply-leave" element={<ApplyLeave />} />
            <Route path="history"    element={<LeaveHistory />} />
            <Route path="approvals"  element={<ManagerApproval />} />
            <Route path="profile"    element={<Profile />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
