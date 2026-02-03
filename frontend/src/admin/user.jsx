import React, { useEffect, useState } from "react";
import "./User.css";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  // form state (dipakai untuk tambah & edit)
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "peminjam",
  });

  const [editId, setEditId] = useState(null);

  const token = localStorage.getItem("token");
  const BASE = "http://localhost:8080/api/users";

  const headersAuth = () => ({
    Authorization: `Bearer ${token}`,
  });

  const loadUsers = async () => {
    try {
      setError("");
      const res = await fetch(BASE, { headers: headersAuth() });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Gagal ambil data user");

      // support kalau backend ngirim [] atau {data: []}
      const list = Array.isArray(data) ? data : data.data || [];
      setUsers(list);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line
  }, []);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setForm({ username: "", password: "", role: "peminjam" });
    setEditId(null);
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    try {
      setError("");

      if (!form.username.trim()) return setError("Username wajib diisi");
      if (!form.password.trim()) return setError("Password wajib diisi");

      const res = await fetch(BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headersAuth(),
        },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          role: form.role,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal tambah user");

      resetForm();
      loadUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  const startEdit = (u) => {
    setEditId(u.id || u.id_user);
    setForm({
      username: u.username || "",
      password: "", // saat edit, password dikosongkan (opsional ganti)
      role: u.role || "peminjam",
    });
  };

  const submitUpdate = async () => {
    try {
      setError("");

      if (!form.username.trim()) return setError("Username wajib diisi");

      // payload update: password hanya dikirim kalau diisi
      const payload = {
        username: form.username,
        role: form.role,
      };
      if (form.password.trim()) payload.password = form.password;

      const res = await fetch(`${BASE}/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...headersAuth(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal update user");

      resetForm();
      loadUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeUser = async (id) => {
    const ok = window.confirm("Yakin hapus user ini?");
    if (!ok) return;

    try {
      setError("");
      const res = await fetch(`${BASE}/${id}`, {
        method: "DELETE",
        headers: headersAuth(),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal hapus user");

      loadUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="usr-wrap">
      <div className="usr-header">
        <h2>MANAJEMEN USER</h2>
        <p>Kelola akun Admin / Petugas / Peminjam.</p>
      </div>

      {error && <div className="usr-alert">{error}</div>}

      <div className="usr-card">
        <h3>{editId ? "Edit User" : "Tambah User"}</h3>

        <form onSubmit={submitAdd} className="usr-form">
          <input
            className="usr-input"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={onChange}
            required
          />

          <input
            className="usr-input"
            type="password"
            name="password"
            placeholder={editId ? "Password baru (opsional)" : "Password"}
            value={form.password}
            onChange={onChange}
            required={!editId}
          />

          <select className="usr-input" name="role" value={form.role} onChange={onChange}>
            <option value="admin">admin</option>
            <option value="petugas">petugas</option>
            <option value="peminjam">peminjam</option>
          </select>

          {!editId ? (
            <button className="usr-btn primary" type="submit">
              + Tambah
            </button>
          ) : (
            <div className="usr-actions">
              <button className="usr-btn primary" type="button" onClick={submitUpdate}>
                Simpan
              </button>
              <button className="usr-btn" type="button" onClick={resetForm}>
                Batal
              </button>
            </div>
          )}
        </form>
      </div>

      <div className="usr-card">
        <h3>Daftar User</h3>

        <div className="usr-table-wrap">
          <table className="usr-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Username</th>
                <th>Role</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="usr-empty">
                    Belum ada user
                  </td>
                </tr>
              ) : (
                users.map((u, i) => {
                  const id = u.id || u.id_user;
                  return (
                    <tr key={id}>
                      <td>{i + 1}</td>
                      <td>{u.username}</td>
                      <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                      <td>
                        <div className="usr-row-actions">
                          <button className="usr-btn" onClick={() => startEdit(u)}>
                            Edit
                          </button>
                          <button className="usr-btn danger" onClick={() => removeUser(id)}>
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
