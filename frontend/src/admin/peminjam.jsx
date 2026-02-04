import { useEffect, useMemo, useState } from "react";
import "./peminjam.css";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const API = `${BASE_URL}/api`;

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

export default function PeminjamPage() {
  const [tab, setTab] = useState("alat");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [kategoriList, setKategoriList] = useState([]);
  const [alatList, setAlatList] = useState([]);
  const [pinjamanSaya, setPinjamanSaya] = useState([]);

  const [kategoriId, setKategoriId] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [alatDipilih, setAlatDipilih] = useState(null);
  const [formPinjam, setFormPinjam] = useState({
    jumlah: 1,
    tgl_pinjam: "",
    tgl_kembali_rencana: "",
    no_hp: "",
    keperluan: "",
  });

const getAuthHeaders = () => {
  let token = localStorage.getItem("token");
  
  // Jika token tersimpan sebagai '"abc"', kita hilangkan tanda kutipnya
  if (token && token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }
  
  return token ? { Authorization: `Bearer ${token}` } : {};
};

  const kategoriMap = useMemo(() => {
    // map: id_kategori -> nama_kategori
    const entries = kategoriList.map((k) => [k.id_kategori, k.nama_kategori]);
    return Object.fromEntries(entries);
  }, [kategoriList]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  /* ================= FETCH ================= */

  const fetchKategori = async () => {
    try {
      setError("");
      const res = await fetch(`${API}/kategori`, { headers: getAuthHeaders()});
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setKategoriList([]);
        setError(json.message || "Gagal ambil kategori");
        return;
      }

      setKategoriList(normalizeList(json));
    } catch {
      setKategoriList([]);
      setError("Gagal ambil kategori");
    }
  };

  const fetchAlat = async (kid = kategoriId) => {
    try {
      setError("");
      const url = new URL(`${API}/alat`);
      // backend kamu mungkin belum support filter query.
      // tapi aman kalau dikirim, kalau tidak dipakai ya tidak masalah.
      if (kid) url.searchParams.set("id_kategori", kid);

      const res = await fetch(url.toString(), { headers: getAuthHeaders() });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAlatList([]);
        setError(json.message || "Gagal ambil alat");
        return;
      }

      setAlatList(normalizeList(json));
    } catch {
      setAlatList([]);
      setError("Gagal ambil alat");
    }
  };

const fetchPinjamanSaya = async () => {
  try {
    setError("");

    const token = localStorage.getItem("token");
    console.log("TOKEN DI PeminjamPage:", token); // ✅ cek beneran kebaca

    const res = await fetch(`${API}/peminjam/me`, {
      headers: getAuthHeaders(),
    });

    const text = await res.text();
    console.log("ME STATUS:", res.status);
    console.log("ME RAW:", text);

    let json = {};
    try { json = JSON.parse(text); } catch {}

    if (!res.ok) {
      setPinjamanSaya([]);
      setError(json.message || text || "Gagal ambil pinjaman");
      return;
    }

    setPinjamanSaya(normalizeList(json));
  } catch (e) {
    setPinjamanSaya([]);
    setError(e?.message || "Gagal ambil pinjaman");
  }
};

  /* ================= EFFECTS ================= */

  useEffect(() => {
    fetchKategori();
  }, []);

useEffect(() => {
  if (tab === "alat") {
    fetchAlat(kategoriId);
  }
}, [kategoriId, tab]);

useEffect(() => {
  if (tab === "pinjaman") {
    fetchPinjamanSaya();
  }
}, [tab]);

  /* ================= ACTIONS ================= */

    const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/"; // atau "/login"
  };

  const openModalPinjam = (alat) => {
    setError("");
    setAlatDipilih(alat);
    setFormPinjam({
      jumlah: 1,
      tgl_pinjam: "",
      tgl_kembali_rencana: "",
      no_hp: "",
      keperluan: "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setAlatDipilih(null);
  };

const submitAjukan = async (e) => {
  e.preventDefault();
  setError("");

  console.log("SUBMIT KEPANGGIL ✅");

  if (!alatDipilih) return setError("Alat belum dipilih");

  const payload = {
    id_alat: alatDipilih.id_alat,
    jumlah: Number(formPinjam.jumlah),
    tanggal_pinjam: formPinjam.tgl_pinjam,
    tanggal_kembali: formPinjam.tgl_kembali_rencana,
    keperluan: formPinjam.keperluan, // Aktifkan jika ingin disimpan
    no_hp: formPinjam.no_hp,
  };

  try {
    const res = await fetch(`${API}/peminjaman`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({})); 
    console.log("STATUS:", res.status);

    if (!res.ok) {
      setError(json.message || "Gagal mengajukan peminjaman");
      return;
    }

    // Reset Form & Tutup Modal
    setShowModal(false);
    showToast("Pengajuan berhasil");

    // Pindah Tab dan Refresh Data
    setTab("pinjaman");
    
    // Beri sedikit delay agar transaksi database benar-benar selesai sebelum fetch ulang
    setTimeout(() => {
      fetchPinjamanSaya();
      fetchAlat(kategoriId);
    }, 300);

  } catch (err) {
    console.log("FETCH ERROR:", err);
    setError("Terjadi kesalahan koneksi");
  }
};

const handleKembalikan = async (id) => {
  try {
    setError("");

    const res = await fetch(`${API}/peminjam/${id}/kembalikan`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status: "Dikembalikan" }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.message || "Gagal mengembalikan");
      return;
    }

    showToast("Pengembalian berhasil");
    fetchPinjamanSaya();
    fetchAlat(kategoriId);
  } catch {
    setError("Gagal mengembalikan");
  }
};

  /* ================= RENDER ================= */

  return (
    <div className="peminjam-container">
      <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }}
>
  <h1 className="peminjam-title">PEMINJAMAN LABORATORIUM SEKOLAH</h1>

  <button className="btn-logout" onClick={handleLogout}>
    Logout
  </button>
</div>

      {toast && <div className="toast-success">{toast}</div>}
      {error && <div className="alert-error">{error}</div>}

      <div className="peminjam-tabs">
        <button
          className={tab === "alat" ? "tab active" : "tab"}
          onClick={() => setTab("alat")}
        >
          Daftar Alat
        </button>
        <button
          className={tab === "pinjaman" ? "tab active" : "tab"}
          onClick={() => setTab("pinjaman")}
        >
          Pinjaman Saya
        </button>
      </div>

      {tab === "alat" && (
        <div className="card">
          <select
            className="select"
            value={kategoriId}
            onChange={(e) => setKategoriId(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            {kategoriList.map((k) => (
              <option key={k.id_kategori} value={k.id_kategori}>
                {k.nama_kategori}
              </option>
            ))}
          </select>

          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Kondisi</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {alatList.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 16 }}>
                    Data alat belum ada / gagal dimuat.
                  </td>
                </tr>
              ) : (
                alatList.map((a) => (
                  <tr key={a.id_alat}>
                    <td>{a.nama_alat}</td>
                    <td>{a.nama_kategori || kategoriMap[a.id_kategori] || a.id_kategori}</td>
                    <td>{a.stok}</td>
                    <td>{a.kondisi}</td>
                    <td>
                      <button className="btn-primary" onClick={() => openModalPinjam(a)}>
                        Pinjam
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "pinjaman" && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Alat</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>

<tbody>
  {pinjamanSaya.length === 0 ? (
    <tr>
      <td colSpan="4" style={{ textAlign: "center", padding: 16 }}>
        Belum ada pinjaman.
      </td>
    </tr>
  ) : (
    pinjamanSaya.map((p) => (
      <tr key={p.id_peminjaman ?? p.id}>
        <td>{p.nama_alat || p.nama_alat_dipinjam || "-"}</td>
        <td>{p.jumlah}</td>
        <td>{p.status}</td>
        <td>
          {p.status?.toLowerCase() !== "dikembalikan" && (
            <button
              className="btn-outline"
              onClick={() => handleKembalikan(p.id_peminjaman ?? p.id)}
            >
              Kembalikan
            </button>
          )}
        </td>
      </tr>
    ))
  )}
</tbody>

          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ajukan Peminjaman</h3>

<form onSubmit={submitAjukan} className="modal-form">
  <div className="form-group">
    <label>Nama Alat</label>
    <input value={alatDipilih?.nama_alat || ""} readOnly />
    <small className="hint">Alat dipinjam</small>
  </div>

  <div className="form-group">
    <label>Jumlah</label>
    <input
      type="number"
      min="1"
      max={alatDipilih?.stok || 999}
      value={formPinjam.jumlah}
      onChange={(e) => setFormPinjam({ ...formPinjam, jumlah: e.target.value })}
      required
    />
    <small className="hint">Maks: {alatDipilih?.stok ?? "-"}</small>
  </div>

  <div className="form-row">
    <div className="form-group">
      <label>Tgl Pinjam</label>
      <input
        type="date"
        value={formPinjam.tgl_pinjam}
        onChange={(e) =>
          setFormPinjam({ ...formPinjam, tgl_pinjam: e.target.value })
        }
        required
      />
      <small className="hint">Mulai</small>
    </div>

    <div className="form-group">
      <label>Tgl Kembali</label>
      <input
        type="date"
        value={formPinjam.tgl_kembali_rencana}
        onChange={(e) =>
          setFormPinjam({
            ...formPinjam,
            tgl_kembali_rencana: e.target.value,
          })
        }
      />
      <small className="hint">Opsional</small>
    </div>
  </div>

  <div className="form-group">
    <label>No HP</label>
    <input
      type="tel"
      placeholder="08xxxxxxxxxx"
      value={formPinjam.no_hp}
      onChange={(e) =>
        setFormPinjam({ ...formPinjam, no_hp: e.target.value })
      }
      required
    />
    <small className="hint">Untuk konfirmasi</small>
  </div>

  <div className="form-group">
    <label>Keperluan</label>
    <textarea
      placeholder="Contoh: Praktikum / TA / Penelitian"
      value={formPinjam.keperluan}
      onChange={(e) =>
        setFormPinjam({ ...formPinjam, keperluan: e.target.value })
      }
      rows={2}
    />
    <small className="hint">Tujuan</small>
  </div>

  <div className="modal-actions">
    <button type="button" onClick={closeModal} className="btn-secondary">
      Batal
    </button>
    <button type="submit" className="btn-primary">
      Ajukan
    </button>
  </div>
</form>
          </div>
        </div>
      )}
    </div>
  );
}
