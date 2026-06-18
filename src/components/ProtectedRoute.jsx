import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children, allowedRoles }) {
  const uid = localStorage.getItem("uid");
  const role = localStorage.getItem("role");

  // If not logged in at all, kick back to login page
  if (!uid) {
    return <Navigate to="/" replace />;
  }

  // If trying to access a route they don't have permission for
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect them to their designated dashboard
    if (role === "MASTER") return <Navigate to="/master" replace />;
    if (role === "L2") return <Navigate to="/l2" replace />;
    if (role === "L1") return <Navigate to="/l1" replace />;
    if (role === "L0") return <Navigate to="/l0" replace />;
    
    // Fallback if role is messed up
    return <Navigate to="/" replace />;
  }

  // If they have access, render the requested page
  return children;
}
