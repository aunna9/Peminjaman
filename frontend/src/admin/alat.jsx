import { useEffect, useState } from "react";
import "./alat.css";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function Alat() {
  const [alatList, setAlatList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  // form state
  const [namaAlat, setNamaAlat] = useState("");
  const [idKategori, setIdKategori] = useState("");
  const [stok, setStok] = useState("");
  const [kondisi, setKondisi] = useState("Baik");
  const [editingId, setEditingId] = useState(null);

  /* ================= FETCH ================= */

  async function fetchAlat() {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/alat`);
      const data = await res.json();
      setAlatList(Array.isArray(data) ? data : []);
    } catch {
      setError("Gagal mengambil data alat.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchKategori() {
    try {
      const res = await fetch(`${BASE_URL}/api/kategori`);
      const data = await res.json();
      setKategoriList(Array.isArray(data) ? data : []);
    } catch {
      setError("Gagal mengambil data kategori.");
    }
  }

  useEffect(() => {
    fetchAlat();
    fetchKategori();
  }, []);

  /* ================= FORM ACTIONS ================= */

  function resetForm() {
    setNamaAlat("");
    setIdKategori("");
    setStok("");
    setKondisi("Baik");
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!namaAlat || !idKategori) {
      setError("Nama alat & kategori wajib diisi.");
      return;
    }

    const payload = {
      nama_alat: namaAlat,
      id_kategori: Number(idKategori),
      stok: Number(stok),
      kondisi,
    };

    try {
      const url = editingId
        ? `${BASE_URL}/api/alat/${editingId}`
        : `${BASE_URL}/api/alat`;

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal menyimpan data.");

      resetForm();
      fetchAlat();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(item) {
    setShowForm(true);
    setEditingId(item.id_alat);
    setNamaAlat(item.nama_alat);
    setIdKategori(item.id_kategori);
    setStok(item.stok);
    setKondisi(item.kondisi);
  }

  async function handleDelete(id) {
    if (!confirm("Yakin hapus alat ini?")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/alat/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus.");
      fetchAlat();
    } catch (err) {
      alert(err.message);
    }
  }

  /* ================= RENDER ================= */
  return (
    <div className="alat-container">
      <div className="alat-header">
        <h1>Data Alat</h1>
        <p>Kelola data alat laboratorium beserta kategori, stok, dan kondisinya.</p>
      </div>

      {!showForm && (
        <button
          className="btn-action btn-primary"
          onClick={() => setShowForm(true)}
          style={{ marginBottom: 12 }}
        >
          + Tambah Alat
        </button>
      )}

{showForm && (
  <div
    className="modal-overlay"
    onClick={() => resetForm()} // klik area luar untuk tutup
  >
    <div
      className="modal-content"
      onClick={(e) => e.stopPropagation()} // biar klik di dalam modal gak nutup
    >
      <div className="modal-header">
        <h3>{editingId ? "Edit Alat" : "Tambah Alat Baru"}</h3>
        <button className="modal-close" type="button" onClick={resetForm}>
          ✕
        </button>
      </div>

      {error && <div className="alat-error">{error}</div>}

      <form className="alat-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nama Alat</label>
          <input
            type="text"
            value={namaAlat}
            onChange={(e) => setNamaAlat(e.target.value)}
            placeholder="Contoh: Mikroskop"
          />
        </div>

        <div className="form-group">
          <label>Kategori</label>
          <select
            value={idKategori}
            onChange={(e) => setIdKategori(e.target.value)}
          >
            <option value="">-- Pilih Kategori --</option>
            {kategoriList.map((kat) => (
              <option key={kat.id_kategori} value={kat.id_kategori}>
                {kat.nama_kategori}
              </option>
            ))}
          </select>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label>Stok</label>
            <input
              type="number"
              value={stok}
              onChange={(e) => setStok(e.target.value)}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Kondisi</label>
            <select value={kondisi} onChange={(e) => setKondisi(e.target.value)}>
              <option value="Baik">Baik</option>
              <option value="Rusak Ringan">Rusak Ringan</option>
              <option value="Rusak Berat">Rusak Berat</option>
            </select>
          </div>
        </div>

        <div className="alat-actions">
          <button className="btn-action btn-primary" type="submit">
            {editingId ? "Simpan Perubahan" : "Simpan Alat"}
          </button>
          <button
            className="btn-action btn-secondary"
            type="button"
            onClick={resetForm}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  </div>
)}


      {loading ? (
        <div className="loading">Memuat data...</div>
      ) : (
        <div className="alat-table-container">
          <table className="alat-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Alat</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Kondisi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {alatList.length > 0 ? (
                alatList.map((item, index) => (
                  <tr key={item.id_alat}>
                    <td>{index + 1}</td>
                    <td>{item.nama_alat}</td>
                    <td>{item.nama_kategori || item.id_kategori}</td>
                    <td>{item.stok}</td>
                    <td>
                        <span className={`badge ${item.kondisi.toLowerCase().replace(" ", "-")}`}>
                            {item.kondisi}
                        </span>
                    </td>
                    <td>
                      <button className="btn-edit" onClick={() => handleEdit(item)}>Edit</button>
                      <button className="btn-delete" onClick={() => handleDelete(item.id_alat)}>Hapus</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>Data kosong</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}