import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import "./App.css";

import AdminLayout from "./admin/adminLayout";
import Login from "./admin/login";
import ProtectedRoute from "./admin/ProtectedRoute";

import Dashboard from "./admin/dashboard";
import Kategori from "./admin/kategori";
import User from "./admin/user";
import Alat from "./admin/alat";
import Peminjaman from "./admin/peminjaman";
import Pengembalian from "./admin/pengembalian";
import Laporan from "./admin/laporan";

import Peminjam from "./admin/peminjam"; // ⬅️ halaman peminjam

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ===== LOGIN ===== */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* ===== ADMIN & PETUGAS ===== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              element={<AdminLayout />}
              allowedRoles={["admin", "petugas"]}
            />
          }
        >
          {/* admin only */}
          <Route
            path="dashboard"
            element={
              <ProtectedRoute
                element={<Dashboard />}
                allowedRoles={["admin"]}
              />
            }
          />
          <Route
            path="kategori"
            element={
              <ProtectedRoute
                element={<Kategori />}
                allowedRoles={["admin"]}
              />
            }
          />
          <Route
            path="user"
            element={
              <ProtectedRoute
                element={<User />}
                allowedRoles={["admin"]}
              />
            }
          />
          <Route
            path="alat"
            element={
              <ProtectedRoute
                element={<Alat />}
                allowedRoles={["admin"]}
              />
            }
          />

          <Route
  path="laporan"
  element={
    <ProtectedRoute
      element={<Laporan />}
      allowedRoles={["petugas"]}
    />
  }
/>


          {/* admin + petugas */}
          <Route path="peminjaman" element={<Peminjaman />} />
          <Route path="pengembalian" element={<Pengembalian />} />
        </Route>

        {/* ===== PEMINJAM ===== */}
        <Route
          path="/peminjam"
          element={
            <ProtectedRoute
              element={<Peminjam />}
              allowedRoles={["peminjam"]}
            />
          }
        />

        {/* ===== FALLBACK ===== */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
