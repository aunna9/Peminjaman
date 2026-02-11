import { useEffect, useMemo, useState } from "react";
import "./pengembalian.css";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const API_URL = `${BASE_URL}/api/pengembalian`;

/* ============== AUTH (sinkron) ============== */
const getToken = () => {
  let token = sessionStorage.getItem("token") || localStorage.getItem("token");
  if (token && token.startsWith('"') && token.endsWith('"')) token = token.slice(1, -1);
  return token;
};
const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function Pengembalian() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rupiah = (n) => Number(n || 0).toLocaleString("id-ID");

  const fetchPengembalian = async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();
      if (!token) throw new Error("Token tidak ada. Silakan login ulang.");

      const res = await fetch(API_URL, {
        headers: { ...getAuthHeaders() },
      });

      if (res.status === 401) throw new Error("401 Unauthorized (token belum benar / belum login)");
      if (!res.ok) throw new Error("Gagal mengambil data pengembalian");

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data ?? [];
      setRows(list);
    } catch (err) {
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
          ...getAuthHeaders(),
        },
      });

      if (res.status === 401) throw new Error("401 Unauthorized (token belum benar / belum login)");
      if (!res.ok) throw new Error("Gagal konfirmasi pengembalian");

      await fetchPengembalian();
    } catch (err) {
      alert(err.message || "Gagal memproses pengembalian");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((r) =>
      [
        r.peminjam,
        r.nama_peminjam,
        r.alat,
        r.nama_alat,
        r.status,
        r.statusTampil,
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
          placeholder="Cari (peminjam / alat / status)..."
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

                // ✅ sinkron: konfirmasi hanya kalau status “menunggu pengembalian”
                const canConfirm =
                  statusLower.includes("menunggu pengembalian") ||
                  statusLower.includes("menunggu konfirmasi") ||
                  statusLower.includes("proses kembali");

                return (
                  <tr key={r.id ?? i}>
                    <td>{i + 1}</td>
                    <td>{r.id ?? "-"}</td>
                    <td>{r.peminjam ?? r.nama_peminjam ?? "-"}</td>
                    <td>{r.alat ?? r.nama_alat ?? "-"}</td>
                    <td>{r.qty ?? 1}</td>
                    <td>{r.tglPinjam ?? "-"}</td>
                    <td>{r.tglKembali ?? "-"}</td>
                    <td>
                      <span className="badge">{r.statusTampil ?? r.status ?? "-"}</span>
                    </td>
                    <td>{Number(r.terlambatHari ?? 0)} hari</td>
                    <td>Rp {rupiah(r.denda ?? 0)}</td>
                    <td>
                      {canConfirm ? (
                        <button className="btn-action btn-approve" onClick={() => konfirmasiPengembalian(r.id)}>
                          Konfirmasi
                        </button>
                      ) : (
                        "-"
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
