import { useEffect, useMemo, useState } from "react";
import "./peminjaman.css";

export default function Peminjaman() {
  const API_URL = "http://localhost:8080/api/peminjaman";

  // ✅ ambil token dari localStorage
  const token = localStorage.getItem("token");
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // data dari backend
  const [rows, setRows] = useState([]);

  // UI state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Semua");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ====== ambil data peminjaman ======
  const fetchPeminjaman = async () => {
    setLoading(true);
    setError("");

    try {
      if (!token) throw new Error("Token tidak ada. Silakan login ulang.");

      const res = await fetch(API_URL, {
        headers: {
          ...authHeaders,
        },
      });

      if (!res.ok) {
        // biar errornya kebaca
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Gagal ambil data peminjaman (${res.status})`);
      }

      const data = await res.json().catch(() => ({}));

      // fleksibel: backend bisa balikin array langsung atau { data: [...] }
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
    fetchPeminjaman();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== aksi: update status ======
  const updateStatus = async (id, newStatus) => {
    if (!id) return;

    try {
      if (!token) throw new Error("Token tidak ada. Silakan login ulang.");

      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders, // ✅ tambah auth
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Gagal update status peminjaman (${res.status})`);
      }

      await fetchPeminjaman();
    } catch (err) {
      console.error(err);
      alert(err.message || "Gagal update status");
    }
  };

  // ====== aksi: hapus ======
  const deletePeminjaman = async (id) => {
    if (!id) return;
    const ok = confirm("Yakin mau hapus data peminjaman ini?");
    if (!ok) return;

    try {
      if (!token) throw new Error("Token tidak ada. Silakan login ulang.");

      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders, // ✅ tambah auth
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Gagal hapus peminjaman (${res.status})`);
      }

      await fetchPeminjaman();
    } catch (err) {
      console.error(err);
      alert(err.message || "Gagal hapus");
    }
  };

  // ====== filter/search di frontend ======
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return rows
      .filter((r) => (status === "Semua" ? true : (r.status || "") === status))
      .filter((r) => {
        if (!s) return true;

        const haystack = [
          r.kode,
          r.peminjam,
          r.kelas,
          r.alat,
          r.status,
          r.tglPinjam,
          r.tglKembali,
          r.nama_alat,
          r.tanggal_pinjam,
          r.tanggal_kembali,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(s);
      });
  }, [rows, q, status]);

  const badgeClass = (st) => {
    const x = (st || "").toLowerCase();
    if (x === "menunggu" || x === "terlambat") return "badge red";
    return "badge";
  };

  const openDetail = (row) => {
    alert(
      `Detail Peminjaman\n\n` +
        `ID: ${row.id_peminjaman ?? row.id ?? "-"}\n` +
        `Peminjam: ${row.peminjam ?? row.username ?? "-"}\n` +
        `Alat: ${row.alat ?? row.nama_alat ?? "-"}\n` +
        `Status: ${row.status ?? "-"}`
    );
  };

  return (
    <div className="peminjaman-container">
      <div className="peminjaman-header">
        <h1>Data Peminjaman</h1>
        <p>
          Kelola dan pantau seluruh transaksi peminjaman alat laboratorium
          (menunggu, aktif, selesai, dan terlambat).
        </p>
      </div>

      <div className="action-bar">
        <input
          className="search-input"
          placeholder="Cari (kode/nama/kelas/alat/status/tanggal)..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>Semua</option>
          <option>Menunggu</option>
          <option>dipinjam</option>
          <option>dikembalikan</option>
          <option>Ditolak</option>
          <option>Terlambat</option>
        </select>

        <button className="btn-action btn-detail" onClick={fetchPeminjaman}>
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, color: "#b00020" }}>
          Error: {error}
        </div>
      )}

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
                <th>Alat</th>
                <th>Tgl Pinjam</th>
                <th>Tgl Kembali</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r, idx) => {
                const id = r.id_peminjaman ?? r.id;
                return (
                  <tr key={id ?? idx}>
                    <td>{idx + 1}</td>
                    <td>{id ?? "-"}</td>
                    <td>{r.peminjam ?? r.username ?? "-"}</td>
                    <td>{r.alat ?? r.nama_alat ?? "-"}</td>
                    <td>{r.tglPinjam ?? r.tanggal_pinjam ?? "-"}</td>
                    <td>{r.tglKembali ?? r.tanggal_kembali ?? "-"}</td>
                    <td>
                      <span className={badgeClass(r.status)}>{r.status}</span>
                    </td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="btn-action btn-detail"
                        onClick={() => openDetail(r)}
                      >
                        Detail
                      </button>

                      <button
                        className="btn-action btn-approve"
                        onClick={() => updateStatus(id, "dipinjam")}
                      >
                        Setujui
                      </button>

                      <button
                        className="btn-action btn-reject"
                        onClick={() => updateStatus(id, "ditolak")}
                      >
                        Tolak
                      </button>

                      <button
                        className="btn-action btn-reject"
                        onClick={() => deletePeminjaman(id)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: 16, color: "#666" }}>
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
