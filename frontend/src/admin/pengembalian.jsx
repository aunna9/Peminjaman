import { useEffect, useMemo, useState } from "react";
import "./pengembalian.css";

export default function Pengembalian() {
  const API_URL = "http://localhost:8080/api/pengembalian";

  const token = sessionStorage.getItem("token");

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rupiah = (n) => Number(n || 0).toLocaleString("id-ID");

  const fetchPengembalian = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(API_URL, {
        headers: { ...authHeaders },
      });

      if (res.status === 401) throw new Error("401 Unauthorized (token belum benar / belum login)");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const konfirmasiPengembalian = async (id) => {
    if (!id) return;

    const ok = confirm("Konfirmasi pengembalian alat ini?");
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/${id}/konfirmasi`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });

      if (res.status === 401) throw new Error("401 Unauthorized (token belum benar / belum login)");
      if (!res.ok) throw new Error("Gagal konfirmasi pengembalian");

      await fetchPengembalian();
    } catch (err) {
      console.error(err);
      alert(err.message || "Gagal memproses pengembalian");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((r) =>
      [
        r.peminjam,
        r.alat,
        r.status,
        r.tglPinjam,
        r.tglKembali,
        String(r.terlambatHari ?? ""),
        String(r.denda ?? ""),
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
        <p>Memantau pengembalian + hitung denda kalau telat</p>
      </div>

      <div className="action-bar">
        <input
          className="search-input"
          placeholder="Cari (peminjam / kelas / alat / status)..."
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
                <th>ID</th>
                <th>Peminjam</th>
                <th>Alat</th>
                <th>Qty</th>
                <th>Tgl Pinjam</th>
                <th>Jatuh Tempo</th>
                <th>Status</th>
                <th>Terlambat</th>
                <th>Denda</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r, i) => {
                const statusLower = String(r.status || "").toLowerCase();
                const sudahKembali = statusLower === "dikembalikan";

                return (
                  <tr key={r.id ?? i}>
                    <td>{i + 1}</td>
                    <td>{r.id ?? "-"}</td>
                    <td>{r.peminjam ?? "-"}</td>
                    <td>{r.alat ?? "-"}</td>
                    <td>{r.qty ?? 1}</td>
                    <td>{r.tglPinjam ?? "-"}</td>
                    <td>{r.tglKembali ?? "-"}</td>
                    <td>
                      <span className="badge">{r.status ?? "dipinjam"}</span>
                    </td>
                    <td>{Number(r.terlambatHari ?? 0)} hari</td>
                    <td>Rp {rupiah(r.denda ?? 0)}</td>
                    <td>
                      {!sudahKembali && (
                        <button
                          className="btn-action btn-approve"
                          onClick={() => konfirmasiPengembalian(r.id)}
                        >
                          Konfirmasi
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="12" style={{ textAlign: "center" }}>
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
