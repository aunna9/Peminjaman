import { useEffect, useState } from "react";
import "./dashboard.css";

export default function Dashboard() {
  const [summary, setSummary] = useState({
    totalUser: 0,
    totalAlat: 0,
    totalKategori: 0,
    peminjamanAktif: 0,
    menunggu: 0,
    terlambat: 0,
  });

  const [peminjamanTerbaru, setPeminjamanTerbaru] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // helper: normalisasi status dari DB kamu
  const normalizeStatus = (raw) => {
    const s = String(raw ?? "").toLowerCase();
    if (s.includes("menunggu") || s.includes("pending")) return "Menunggu";
    if (s.includes("terlambat") || s.includes("telat") || s.includes("late")) return "Terlambat";
    if (s.includes("dipinjam") || s.includes("aktif")) return "Dipinjam";
    return raw || "-";
  };

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const API = `${BASE_URL}/api`;

const token = sessionStorage.getItem("token");

const res = await fetch(`${API}/peminjaman`, {
  headers: { Authorization: `Bearer ${token}` },
});

        const contentType = res.headers.get("content-type") || "";

        if (!res.ok) throw new Error(`Gagal ambil peminjaman. Status: ${res.status}`);

        // guard: pastikan JSON
        if (!contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Response bukan JSON (kemungkinan kena HTML). Contoh: ${text.slice(0, 80)}`
          );
        }

        const data = await res.json(); // sekarang aman
        const list = Array.isArray(data) ? data : (data?.data ?? []);

        const counts = list.reduce(
          (acc, item) => {
            const st = normalizeStatus(item.status);
            if (st === "Dipinjam") acc.peminjamanAktif += 1;
            else if (st === "Menunggu") acc.menunggu += 1;
            else if (st === "Terlambat") acc.terlambat += 1;
            return acc;
          },
          { peminjamanAktif: 0, menunggu: 0, terlambat: 0 }
        );

        // ambil 5 terbaru (kalau ada created_at / tanggal)
        const terbaru = [...list]
          .sort((a, b) => new Date(b.created_at || b.tanggal || 0) - new Date(a.created_at || a.tanggal || 0))
          .slice(0, 5)
          .map((x) => ({
            nama: x.nama_peminjam || x.nama || "-",
            alat: x.nama_alat || x.alat || "-",
            qty: x.qty || x.jumlah || 1,
            tgl: x.tanggal || x.created_at || "-",
            status: normalizeStatus(x.status),
          }));

        if (!alive) return;

        setSummary((prev) => ({
          ...prev,
          peminjamanAktif: counts.peminjamanAktif,
          menunggu: counts.menunggu,
          terlambat: counts.terlambat,
        }));

        setPeminjamanTerbaru(terbaru);

        // log sementara dari data terbaru
        setLogs(
          terbaru.map((x) => ({
            title: `Peminjaman: ${x.nama}`,
            sub: `${x.alat} (Qty ${x.qty}) • Status: ${x.status}`,
          }))
        );
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Terjadi error");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      alive = false;
    };
  }, []);

  const pillClass = (status) => {
    if (status === "Menunggu" || status === "Terlambat") return "pill red";
    return "pill";
  };

  if (loading) return <div className="admin-dashboard">Loading dashboard...</div>;
  if (error) return <div className="admin-dashboard">Error: {error}</div>;

return (
  <div className="admin-dashboard">
    {/* ===== HEADER ===== */}
    <div className="header">
      <div>
        <h1 className="title">Dashboard Admin</h1>
        <p className="sub">
          Ringkasan pengelolaan user, inventaris alat, peminjaman, pengembalian,
          dan log aktivitas.
        </p>
      </div>

      <div className="badge">Akses: Admin</div>
    </div>

    {/* ===== GRID UTAMA (KIRI: cards+tabel, KANAN: log) ===== */}
    <div className="dashboard-grid">
      {/* ===== KIRI ===== */}
      <div className="dashboard-main">
        {/* cards */}
        <div className="grid">
          <div className="card">
            <div className="cardTop">
              <div className="cardLabel">Peminjaman Aktif</div>
            </div>
            <div className="cardValue">{summary.peminjamanAktif}</div>
            <div className="cardHint">Dari /api/peminjaman</div>
          </div>

          <div className="card">
            <div className="cardTop">
              <div className="cardLabel">Menunggu Persetujuan</div>
            </div>
            <div className="cardValue">{summary.menunggu}</div>
            <div className="cardHint">Dari /api/peminjaman</div>
          </div>

          <div className="card">
            <div className="cardTop">
              <div className="cardLabel">Terlambat</div>
            </div>
            <div className="cardValue red">{summary.terlambat}</div>
            <div className="cardHint">Dari /api/peminjaman</div>
          </div>
        </div>

        {/* tabel peminjaman terbaru */}
        <div className="section">
          <div className="card">
            <h3 className="sectionTitle">Peminjaman Terbaru</h3>
            <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Peminjam</th>
                  <th>Alat</th>
                  <th>Qty</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {peminjamanTerbaru.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 12 }}>
                      Belum ada data peminjaman.
                    </td>
                  </tr>
                ) : (
                  peminjamanTerbaru.map((x, i) => (
                    <tr key={i}>
                      <td>{x.nama}</td>
                      <td>{x.alat}</td>
                      <td>{x.qty}</td>
                      <td className="tglCol">
  {x.tgl && x.tgl !== "-" ? new Date(x.tgl).toLocaleString("id-ID") : "-"}
</td>

                      <td>
                        <span className={pillClass(x.status)}>{x.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>

      {/* ===== KANAN (LOG) ===== */}
      <aside className="dashboard-log">
        <h3 className="sectionTitle">Log Aktivitas</h3>

        <div className="list">
          {logs.length === 0 ? (
            <div style={{ padding: 12 }}>Belum ada log.</div>
          ) : (
            logs.map((l, i) => (
              <div className="logItem" key={i}>
                <div className="logTitle">{l.title}</div>
                <div className="logSub">{l.sub}</div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  </div>
);
}