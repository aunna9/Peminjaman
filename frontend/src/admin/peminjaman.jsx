import { useEffect, useMemo, useState } from "react";
import "./peminjaman.css";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const API_URL = `${BASE_URL}/api/peminjaman`;

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

/* ============== STATUS HELPERS (sinkron) ============== */
const isReturned = (r) => {
  const s = String(r?.status || "").toLowerCase();
  return s.includes("dikembalikan") || s.includes("selesai") || s.includes("kembali");
};

const isActiveForLate = (r) => {
  const s = String(r?.status || "").toLowerCase();
  if (isReturned(r)) return false;
  if (s === "dipinjam") return true;
  if (s.includes("menunggu pengembalian")) return true;
  return false; // menunggu (pengajuan) / ditolak => jangan telat
};

const isLateByDate = (r) => {
  if (!isActiveForLate(r)) return false;

  const due = r?.tanggal_kembali || r?.tglKembali || r?.tgl_kembali_rencana;
  if (!due) return false;

  const dueDate = new Date(due);
  if (isNaN(dueDate.getTime())) return false;

  dueDate.setHours(23, 59, 59, 999);
  return new Date() > dueDate;
};

const displayStatus = (r) => (isLateByDate(r) ? "terlambat" : r?.status || "-");

export default function Peminjaman() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Semua");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPeminjaman = async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();
      if (!token) throw new Error("Token tidak ada. Silakan login ulang.");

      const res = await fetch(API_URL, { headers: { ...getAuthHeaders() } });
      const txt = await res.text();

      if (!res.ok) throw new Error(txt || `Gagal ambil data peminjaman (${res.status})`);

      const data = txt ? JSON.parse(txt) : {};
      const list = Array.isArray(data) ? data : data.data ?? [];
      setRows(list);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeminjaman();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badgeClass = (st) => {
    const x = String(st || "").toLowerCase();
    if (x === "terlambat") return "badge red";
    if (x.includes("menunggu pengembalian")) return "badge red";
    if (x === "menunggu") return "badge"; // bebas kamu mau style khusus
    if (x === "dipinjam") return "badge";
    if (x === "ditolak") return "badge";
    if (x.includes("kembali") || x.includes("selesai") || x.includes("dikembalikan")) return "badge";
    return "badge";
  };

  const adaKeterlambatan = useMemo(() => {
    return rows.some((r) => String(displayStatus(r)).toLowerCase() === "terlambat");
  }, [rows]);

  const updateStatus = async (id, newStatus) => {
    if (id == null) return;

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const raw = await res.text();
      if (!res.ok) throw new Error(raw || `Gagal update (${res.status})`);

      await fetchPeminjaman();
    } catch (err) {
      alert(err.message);
    }
  };

  const deletePeminjaman = async (id) => {
    if (!id) return;
    const ok = confirm("Yakin mau hapus data peminjaman ini?");
    if (!ok) return;

    try {
      const token = getToken();
      if (!token) throw new Error("Token tidak ada. Silakan login ulang.");

      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });

      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `Gagal hapus peminjaman (${res.status})`);

      await fetchPeminjaman();
    } catch (err) {
      alert(err.message || "Gagal hapus");
    }
  };

  const rejectWithReason = async (id) => {
  const alasan = prompt("Masukkan alasan penolakan:", "");
  if (alasan === null) return; // klik Cancel
  if (!alasan.trim()) {
    alert("Alasan penolakan wajib diisi");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        status: "ditolak",
        alasan_tolak: alasan.trim(),
      }),
    });

    const raw = await res.text();
    if (!res.ok) throw new Error(raw || "Gagal menolak peminjaman");

    await fetchPeminjaman(); // refresh tabel
  } catch (err) {
    alert(err.message);
  }
};


  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return rows
      .filter((r) => {
        if (status === "Semua") return true;
        return String(displayStatus(r)).toLowerCase() === String(status).toLowerCase();
      })
      .filter((r) => {
        if (!s) return true;

        const haystack = [
          r.kode,
          r.nama_peminjam,
          r.username,
          r.peminjam,
          r.no_hp,
          r.alat,
          r.nama_alat,
          r.kelas,
          r.tglPinjam,
          r.tglKembali,
          r.tanggal_pinjam,
          r.tanggal_kembali,
          r.status,
          displayStatus(r),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(s);
      });
  }, [rows, q, status]);

  return (
    <div className="peminjaman-container">
      <div className="peminjaman-header">
        <h1>Data Peminjaman</h1>
        <p>Kelola dan pantau seluruh transaksi peminjaman alat laboratorium.</p>
      </div>

      {/* Banner admin juga boleh sama */}
      {adaKeterlambatan && (
        <div style={{ padding: 12, background: "#fff1f0", borderLeft: "5px solid #ff4d4f", marginBottom: 12 }}>
          <strong>⚠️ Ada peminjaman terlambat.</strong>
        </div>
      )}

      <div className="action-bar">
        <input
          className="search-input"
          placeholder="Cari (nama/no hp/alat/status/tanggal)..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Semua">Semua</option>
          <option value="menunggu">menunggu</option>
          <option value="dipinjam">dipinjam</option>
          <option value="menunggu pengembalian">menunggu pengembalian</option>
          <option value="dikembalikan">dikembalikan</option>
          <option value="ditolak">ditolak</option>
          <option value="terlambat">terlambat</option>
        </select>

        <button className="btn-action btn-detail" onClick={fetchPeminjaman}>
          🔄 Refresh
        </button>
      </div>

      {error && <div style={{ padding: 12, color: "#b00020" }}>Error: {error}</div>}

      <div className="table-box">
        <h2>Daftar Peminjaman</h2>

        {loading ? (
          <div style={{ padding: 12, color: "#666" }}>Memuat data...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>ID</th>
                <th>Peminjam</th>
                <th>No HP</th>
                <th>Alat</th>
                <th>Tgl Pinjam</th>
                <th>Jatuh Tempo</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r, idx) => {
                const id = r.id_peminjaman ?? r.id;
                const st = displayStatus(r);
                const stLower = String(st).toLowerCase();
                const isLate = stLower === "terlambat";
                const returned = isReturned(r);

                // ✅ admin hanya "Setujui" kalau masih pengajuan menunggu
                const canApprove = String(r.status || "").toLowerCase() === "menunggu";

                // optional: blok approve kalau sudah telat/returned (harusnya ga kejadian buat "menunggu")
                const hideApprove = !canApprove || isLate || returned;

                return (
                  <tr key={id ?? idx} style={isLate ? { backgroundColor: "#fff1f0", transition: "0.3s" } : {}}>
                    <td>{idx + 1}</td>
                    <td>{id ?? "-"}</td>
                    <td>{r.nama_peminjam ?? r.username ?? r.peminjam ?? "-"}</td>
                    <td>{r.no_hp ?? "-"}</td>
                    <td>{r.alat ?? r.nama_alat ?? "-"}</td>
                    <td>{r.tglPinjam ?? r.tanggal_pinjam ?? "-"}</td>
                    <td>{r.tglKembali ?? r.tanggal_kembali ?? "-"}</td>

                    <td style={isLate ? { color: "#cf1322", fontWeight: "bold" } : {}}>
                      <span className={badgeClass(st)}>{st}{isLate ? " (Segera Kembalikan!)" : ""}</span>
                    </td>

                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {!hideApprove && (
                        <button className="btn-action btn-approve" onClick={() => updateStatus(id, "dipinjam")}>
                          Setujui
                        </button>
                      )}

                      {/* Tolak biasanya buat pengajuan "menunggu" */}
                      <button className="btn-action btn-reject" onClick={() => rejectWithReason(id)}>
                        Tolak
                      </button>


                      <button className="btn-action btn-reject" onClick={() => deletePeminjaman(id)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ padding: 16, color: "#666" }}>
                    Tidak ada data yang cocok.
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
