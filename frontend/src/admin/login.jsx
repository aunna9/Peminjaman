import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css"; // pastiin kamu import css ini

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:8080/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        setError("Response backend bukan JSON.");
        return;
      }

      if (!response.ok) {
        setError(data.message || `Login gagal (${response.status})`);
        return;
      }

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("role", (data.role || "").toLowerCase());

      const role = (data.role || "").toLowerCase();
      if (role === "admin") navigate("/admin/dashboard", { replace: true });
      else if (role === "petugas") navigate("/admin/peminjaman", { replace: true });
      else if (role === "peminjam") navigate("/peminjam/", { replace: true });
      else setError("Role tidak dikenali");
    } catch (err) {
      setError("Server tidak merespon / fetch gagal");
    }
  };

  return (
    <div className="login-wrap">
      {/* dekorasi background */}
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      <div className="bg-grid" />

      <div className="login-card">
        <div className="login-badge">LAB</div>

        <div className="login-header">
          <h2>Selamat Datang</h2>
          <p>Silahkan login untuk mengelola alat</p>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>Username</label>
            <div className="input-wrap">
              <span className="input-icon">👤</span>
              <input
                type="text"
                name="username"
                placeholder="Masukkan username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button type="submit" className="login-btn">
            Masuk Ke Sistem <span className="btn-arrow">→</span>
          </button>

          <div className="login-footer">
            <span>Pastikan username & password benar.</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;