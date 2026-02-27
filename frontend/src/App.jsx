import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import CRDashboard from "./pages/CRDashboard";
import NoteManager from "./pages/NoteManager";

// ===============================
// Protected Route Component
// ===============================
const ProtectedRoute = ({ children, role }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <Routes>

        {/* Public Routes */}
        <Route
          path="/"
          element={
            user ? (
              user.role === "cr" ? (
                <Navigate to="/cr-dashboard" />
              ) : (
                <Navigate to="/student-dashboard" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student Dashboard */}
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* CR Dashboard */}
        <Route
          path="/cr-dashboard"
          element={
            <ProtectedRoute role="cr">
              <CRDashboard />
            </ProtectedRoute>
          }
        />

        {/* CR Note Manager */}
        <Route
          path="/note-manager"
          element={
            <ProtectedRoute role="cr">
              <NoteManager />
            </ProtectedRoute>
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </Router>
  );
}

export default App;