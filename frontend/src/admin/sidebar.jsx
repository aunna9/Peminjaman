import { Link, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaTools,
  FaUsers,
  FaSignOutAlt,
  FaTags,
  FaExchangeAlt,
  FaReply,
  FaFileAlt,
} from "react-icons/fa";
import "./sidebar.css";

const Sidebar = () => {
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true }); // ✅ aman
  };

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Inventaris LAB Sekolah</h2>

      <ul className="sidebar-menu">
        {/* ===== ADMIN ===== */}
        {role === "admin" && (
          <>
            <li>
              <Link to="/admin/dashboard" className="menu-link">
                <FaHome /> Dashboard
              </Link>
            </li>

            <li>
              <Link to="/admin/user" className="menu-link">
                <FaUsers /> Manajemen User
              </Link>
            </li>

            <li>
              <Link to="/admin/kategori" className="menu-link">
                <FaTags /> Kategori
              </Link>
            </li>

            <li>
              <Link to="/admin/alat" className="menu-link">
                <FaTools /> Data Alat
              </Link>
            </li>

            <li>
              <Link to="/admin/peminjaman" className="menu-link">
                <FaExchangeAlt /> Peminjaman
              </Link>
            </li>

            <li>
              <Link to="/admin/pengembalian" className="menu-link">
                <FaReply /> Pengembalian
              </Link>
            </li>

            {/* kalau kamu punya laporan/log */}
            {/* <li>
              <Link to="/admin/log" className="menu-link">
                <FaFileAlt /> Log Aktivitas
              </Link>
            </li> */}
          </>
        )}

        {/* ===== PETUGAS ===== */}
        {role === "petugas" && (
          <>
            <li>
              <Link to="/admin/peminjaman" className="menu-link">
                <FaExchangeAlt /> Peminjaman
              </Link>
            </li>

            <li>
              <Link to="/admin/pengembalian" className="menu-link">
                <FaReply /> Pengembalian
              </Link>
            </li>

            <li>
              <Link to="/admin/laporan" className="menu-link">
                <FaFileAlt /> Laporan
              </Link>
            </li>
          </>
        )}

        {/* ===== PEMINJAM ===== */}
{/* ===== PEMINJAM ===== */}
{role === "peminjam" && (
  <>
    <li>
      <Link to="/peminjam" className="menu-link">
        <FaTools /> Peminjam
      </Link>
    </li>
  </>
)}

        {/* ===== LOGOUT (semua role) ===== */}
        <li className="logout">
          <button onClick={handleLogout} className="menu-link logout-btn">
            <FaSignOutAlt /> Logout
          </button>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
