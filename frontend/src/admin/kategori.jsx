import { useEffect, useState } from "react";
import "./kategori.css";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const API_URL = `${BASE_URL}/api/kategori`;

export default function Kategori() {
  const [kategori, setKategori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  // form state (DB cuma butuh nama_kategori)
  const [nama, setNama] = useState("");
  const [editingId, setEditingId] = useState(null);

  async function fetchKategori() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`Gagal ambil data (${res.status})`);

      const data = await res.json();
      setKategori(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat mengambil data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKategori();
  }, []);

  function resetForm() {
    setNama("");
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!nama.trim()) {
      setError("Nama kategori wajib diisi.");
      return;
    }

    // SESUAI DB: nama_kategori
    const payload = { nama_kategori: nama.trim() };

    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await safeReadText(res);
        throw new Error(msg || `Gagal simpan data (${res.status})`);
      }

      resetForm();
      fetchKategori();
    } catch (err) {
      setError(err.message || "Gagal menyimpan data.");
    }
  }

  function handleEditClick(item) {
    setShowForm(true);
    setEditingId(item.id_kategori);
    setNama(item.nama_kategori ?? "");
    setError("");
  }

  async function handleDelete(id_kategori) {
    const ok = confirm("Yakin mau hapus kategori ini?");
    if (!ok) return;

    try {
      setError("");
      const res = await fetch(`${API_URL}/${id_kategori}`, { method: "DELETE" });

      if (!res.ok) {
        const msg = await safeReadText(res);
        throw new Error(msg || `Gagal hapus data (${res.status})`);
      }

      // kalau lagi edit item yang dihapus, tutup form
      if (editingId === id_kategori) resetForm();

      fetchKategori();
    } catch (err) {
      setError(err.message || "Gagal menghapus data.");
    }
  }

  return (
    <div className="kategori-container">
      <div className="kategori-header">
        <h1>Data Kategori</h1>
        <p>Kelola kategori alat laboratorium untuk memudahkan pengelompokan alat.</p>
      </div>

      {/* BUTTON TAMBAH */}
      <div style={{ marginBottom: 12 }}>
        {!showForm && (
          <button
            type="button"
            className="btn-action btn-primary"
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setNama("");
              setError("");
            }}
          >
            + Tambah Kategori
          </button>
        )}
      </div>

      {/* FORM (muncul saat showForm = true) */}
      {showForm && (
        <div className="kategori-form-card">
          {error && <div className="kategori-error">{error}</div>}

          <form className="kategori-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Nama kategori"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />

            <div className="kategori-actions">
              <button type="submit" className="btn-action btn-primary">
                {editingId ? "Simpan Perubahan" : "Simpan Kategori"}
              </button>

              <button
                type="button"
                className="btn-action btn-secondary"
                onClick={resetForm}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLE */}
      {loading ? (
        <div>Loading data kategori...</div>
      ) : (
        <div className="kategori-table-container">
          <table className="kategori-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Kategori</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {kategori.length === 0 ? (
                <tr>
                  <td colSpan="3" className="kategori-empty">
                    Data kosong.
                  </td>
                </tr>
              ) : (
                kategori.map((item, index) => (
                  <tr key={item.id_kategori ?? index}>
                    <td>{index + 1}</td>
                    <td>{item.nama_kategori ?? "-"}</td>
                    <td>
                      <button
                        className="btn-action btn-mini btn-edit"
                        onClick={() => handleEditClick(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-action btn-mini btn-delete"
                        onClick={() => handleDelete(item.id_kategori)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function safeReadText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
