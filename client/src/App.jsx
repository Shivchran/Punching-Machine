
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";

import "./App.css";

function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem("token");

  let employee = null;

  try {
    employee = JSON.parse(
      localStorage.getItem("employee") || "null"
    );
  } catch {
    employee = null;
  }

  if (!token || !employee) {
    localStorage.removeItem("token");
    localStorage.removeItem("employee");

    return <Navigate to="/" replace />;
  }

  if (requiredRole && employee.role !== requiredRole) {
    return (
      <Navigate
        to={employee.role === "admin" ? "/admin-dashboard" : "/dashboard"}
        replace
      />
    );
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}

        <Route path="/" element={<Login />} />

        {/* Employee Dashboard */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="employee">
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard */}

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Invalid URL */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;