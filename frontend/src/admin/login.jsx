import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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

  console.log("LOGIN DIKLIK", formData);

  try {
    console.log("START FETCH...");
    const response = await fetch("http://localhost:8080/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    console.log("STATUS:", response.status);

    const raw = await response.text();
    console.log("RAW:", raw);

    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      console.log("GAGAL PARSE JSON");
      setError("Response backend bukan JSON.");
      return;
    }

    console.log("DATA:", data);

    if (!response.ok) {
      setError(data.message || `Login gagal (${response.status})`);
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", (data.role || "").toLowerCase());


    console.log("ROLE TERSIMPAN:", localStorage.getItem("role"));
    console.log("TOKEN ADA:", !!localStorage.getItem("token"));

    // redirect petugas harus ke /admin/peminjaman (sesuai yang kamu mau)
    const role = (data.role || "").toLowerCase();
    if (role === "admin") navigate("/admin/dashboard", { replace: true });
    else if (role === "petugas") navigate("/admin/peminjaman", { replace: true });
    else if (role === "peminjam") navigate("/peminjam", { replace: true });
    else setError("Role tidak dikenali");
  } catch (err) {
    console.error("FETCH ERROR:", err);
    setError("Server tidak merespon / fetch gagal");
  }
};


  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Selamat Datang</h2>
          <p>Silahkan login untuk mengelola alat</p>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              placeholder="Masukkan username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="login-btn">
            Masuk Ke Sistem
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
