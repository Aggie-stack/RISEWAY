import { Navigate } from "react-router-dom";

function RoleRoute({ children, allowed }) {
  const role = localStorage.getItem("role");

  if (!allowed.includes(role)) {
    // Redirect to first allowed page based on role
    if (role === "admin") return <Navigate to="/students" replace />;
    if (role === "receptionist") return <Navigate to="/students" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RoleRoute;
