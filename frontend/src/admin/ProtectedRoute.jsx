import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ element, allowedRoles = [] }) => {
const token = sessionStorage.getItem("token");
const role = (sessionStorage.getItem("role") || "").toLowerCase();

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
    if (role === "petugas") return <Navigate to="/admin/peminjaman" replace />;
    if (role === "peminjam") return <Navigate to="/peminjam" replace />; // ✅ FIX DI SINI
    return <Navigate to="/login" replace />;
  }

  return element;
};

export default ProtectedRoute;
