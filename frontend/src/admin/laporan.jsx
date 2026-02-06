import { useEffect, useMemo, useState } from "react";
import "./laporan.css";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const API = `${BASE_URL}/api`;

const getAuthHeaders = () => {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const toDateInput = (d) => d.toISOString().slice(0, 10);

export default function Laporan() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // default: 7 hari terakhir
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toDateInput(d);
  });
  const [to, setTo] = useState(() => toDateInput(new Date()));

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/peminjaman`, { headers: { ...getAuthHeaders() } });
      if (res.status === 401) throw new Error("401 Unauthorized. Silakan login ulang.");
      if (res.status === 403) throw new Error("403 Forbidden. Role tidak diizinkan.");
      if (!res.ok) throw new Error("Gagal mengambil data peminjaman");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data ?? [];
      setRows(list);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  const filtered = useMemo(() => {
    const fromD = new Date(from + "T00:00:00");
    const toD = new Date(to + "T23:59:59");
    return rows.filter((r) => {
      const t = new Date(r.tanggal_pinjam || r.created_at || r.tglPinjam || Date.now());
      return t >= fromD && t <= toD;
    });
  }, [rows, from, to]);

  const stats = useMemo(() => {
    const norm = (s) => String(s || "").toLowerCase();
    let total = filtered.length;
    let menunggu = 0;
    let aktif = 0;
    let selesai = 0;
    let terlambat = 0;

    for (const r of filtered) {
      const s = norm(r.status);
      if (s.includes("menunggu") || s.includes("pending")) menunggu++;
      else if (s.includes("aktif") || s.includes("dipinjam") || s.includes("disetujui")) aktif++;
      else if (s.includes("kembali") || s.includes("selesai") || s.includes("dikembalikan")) selesai++;
      else if (s.includes("telat") || s.includes("terlambat")) terlambat++;
    }

    return { total, menunggu, aktif, selesai, terlambat };
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["id", "peminjam", "no_hp", "alat", "tgl_pinjam", "tgl_kembali", "status"];
    const lines = [
      headers.join(","),
      ...filtered.map((r) =>
        [
          r.id_peminjaman ?? r.id ?? "",
          (r.nama_peminjam ?? r.username ?? "").toString().replaceAll(",", " "),
          (r.no_hp ?? "").toString().replaceAll(",", " "),
          (r.nama_alat ?? "").toString().replaceAll(",", " "),
          r.tanggal_pinjam ?? r.tglPinjam ?? "",
          r.tanggal_kembali ?? r.tglKembali ?? "",
          r.status ?? "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan_${from}_sd_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="laporan-page">
      <h1 className="laporan-title">Laporan (Petugas)</h1>
      <p className="laporan-sub">Rekap peminjaman berdasarkan rentang tanggal.</p>

      <div className="laporan-toolbar">
        <div className="laporan-filter">
          <label>Dari</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div className="laporan-filter">
          <label>Sampai</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <button className="btn" onClick={fetchData}>Refresh Data</button>
        <button className="btn outline" onClick={exportCSV} disabled={filtered.length === 0}>
          Export CSV
        </button>
      </div>

      {error && <div className="laporan-error">{error}</div>}
      {loading ? (
        <div className="laporan-loading">Loading...</div>
      ) : (
        <>
          <div className="laporan-cards">
            <div className="card"><div className="card-label">Total</div><div className="card-num">{stats.total}</div></div>
            <div className="card"><div className="card-label">Menunggu</div><div className="card-num">{stats.menunggu}</div></div>
            <div className="card"><div className="card-label">Aktif</div><div className="card-num">{stats.aktif}</div></div>
            <div className="card"><div className="card-label">Selesai</div><div className="card-num">{stats.selesai}</div></div>
            <div className="card"><div className="card-label">Terlambat</div><div className="card-num">{stats.terlambat}</div></div>
          </div>

          <div className="laporan-tablewrap">
            <table className="laporan-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>ID</th>
                  <th>Peminjam</th>
                  <th>No HP</th>
                  <th>Alat</th>
                  <th>Tgl Pinjam</th>
                  <th>Tgl Kembali</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id_peminjaman ?? r.id ?? idx}>
                    <td>{idx + 1}</td>
                    <td>{r.id_peminjaman ?? r.id}</td>
                    <td>{r.nama_peminjam ?? r.username ?? "-"}</td>
                    <td>{r.no_hp ?? "-"}</td>
                    <td>{r.nama_alat ?? "-"}</td>
                    <td>{String(r.tanggal_pinjam ?? r.tglPinjam ?? "-")}</td>
                    <td>{String(r.tanggal_kembali ?? r.tglKembali ?? "-")}</td>
                    <td>{r.status ?? "-"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 16 }}>
                      Tidak ada data pada rentang tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
