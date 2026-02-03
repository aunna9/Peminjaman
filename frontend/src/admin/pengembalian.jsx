import { useEffect, useMemo, useState } from "react";
import "./pengembalian.css";

export default function Pengembalian() {
  const API_URL = "http://localhost:8080/api/pengembalian";

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ===== ambil data pengembalian =====
  const fetchPengembalian = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Gagal mengambil data pengembalian");

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data ?? [];

      setRows(list);
    } catch (err) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPengembalian();
  }, []);

  // ===== konfirmasi pengembalian =====
  const konfirmasiPengembalian = async (id) => {
    if (!id) return;

    const ok = confirm("Konfirmasi pengembalian alat ini?");
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Dikembalikan" }),
      });

      if (!res.ok) throw new Error("Gagal konfirmasi pengembalian");

      await fetchPengembalian();
    } catch (err) {
      console.error(err);
      alert(err.message || "Gagal memproses pengembalian");
    }
  };

  // ===== filter pencarian =====
  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return rows.filter((r) =>
      [
        r.kode,
        r.peminjam,
        r.kelas,
        r.alat,
        r.status,
        r.tglKembali,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  return (
    <div className="pengembalian-container">
      <div className="pengembalian-header">
        <h1>Data Pengembalian</h1>
        <p>Kelola dan verifikasi pengembalian alat laboratorium</p>
      </div>

      <div className="action-bar">
        <input
          className="search-input"
          placeholder="Cari pengembalian..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button className="btn-action btn-detail" onClick={fetchPengembalian}>
          Refresh
        </button>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="table-box">
        <h2>Daftar Pengembalian</h2>

        {loading ? (
          <p>Memuat data...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Kode</th>
                <th>Peminjam</th>
                <th>Kelas</th>
                <th>Alat</th>
                <th>Qty</th>
                <th>Tgl Kembali</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id ?? i}>
                  <td>{i + 1}</td>
                  <td>{r.kode}</td>
                  <td>{r.peminjam}</td>
                  <td>{r.kelas}</td>
                  <td>{r.alat}</td>
                  <td>{r.qty}</td>
                  <td>{r.tglKembali}</td>
                  <td>
                    <span className="badge">
                      {r.status ?? "Dipinjam"}
                    </span>
                  </td>
                  <td>
                    {r.status !== "Dikembalikan" && (
                      <button
                        className="btn-action btn-approve"
                        onClick={() => konfirmasiPengembalian(r.id)}
                      >
                        Konfirmasi
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center" }}>
                    Tidak ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
