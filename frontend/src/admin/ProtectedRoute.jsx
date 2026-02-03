import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ element, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").trim().toLowerCase();

  console.log("[ProtectedRoute]", { token, role, allowedRoles });

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    console.log("[ProtectedRoute] ROLE DITOLAK");
    return <Navigate to="/login" replace />;
  }

  return element;
};

export default ProtectedRoute;
