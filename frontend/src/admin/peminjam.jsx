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
    keperluan: "",
  });

  const token = localStorage.getItem("token");
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

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
      const res = await fetch(`${API}/kategori`, { headers: authHeaders });
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

      const res = await fetch(url.toString(), { headers: authHeaders });
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
      const res = await fetch(`${API}/peminjam/me`, { headers: authHeaders });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPinjamanSaya([]);
        setError(json.message || "Gagal ambil pinjaman");
        return;
      }

      setPinjamanSaya(normalizeList(json));
    } catch {
      setPinjamanSaya([]);
      setError("Gagal ambil pinjaman");
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

  const openModalPinjam = (alat) => {
    setError("");
    setAlatDipilih(alat);
    setFormPinjam({
      jumlah: 1,
      tgl_pinjam: "",
      tgl_kembali_rencana: "",
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
    //keperluan: formPinjam.keperluan,
  };

  console.log("PAYLOAD:", payload);

  try {
    const res = await fetch(`${API}/peminjaman`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });

    console.log("STATUS:", res.status);

    const text = await res.text();             // ✅ penting
    console.log("RAW RESPONSE:", text);

    let json = {};
    try { json = JSON.parse(text); } catch {}

    if (!res.ok) {
      setError(json.message || text || "Gagal mengajukan peminjaman");
      return;
    }

    setShowModal(false);
    showToast("Pengajuan berhasil");
    setTab("pinjaman");
    fetchPinjamanSaya();
    fetchAlat(kategoriId);

  } catch (err) {
    console.log("FETCH ERROR:", err);
    setError(err?.message || "Gagal mengajukan peminjaman");
  }
};

const handleKembalikan = async (id) => {
  try {
    setError("");

    const res = await fetch(`${API}/peminjam/${id}/kembalikan`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
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
      <h1 className="peminjam-title">PEMINJAM</h1>

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

            <form onSubmit={submitAjukan}>
              <input value={alatDipilih?.nama_alat || ""} readOnly />

              <input
                type="number"
                min="1"
                max={alatDipilih?.stok || 999999}
                value={formPinjam.jumlah}
                onChange={(e) => setFormPinjam({ ...formPinjam, jumlah: e.target.value })}
              />

              <input
                type="date"
                value={formPinjam.tgl_pinjam}
                onChange={(e) => setFormPinjam({ ...formPinjam, tgl_pinjam: e.target.value })}
              />

              <input
                type="date"
                value={formPinjam.tgl_kembali_rencana}
                onChange={(e) =>
                  setFormPinjam({ ...formPinjam, tgl_kembali_rencana: e.target.value })
                }
              />

              <textarea
                placeholder="Keperluan"
                value={formPinjam.keperluan}
                onChange={(e) => setFormPinjam({ ...formPinjam, keperluan: e.target.value })}
              />

              <div className="modal-actions">
                <button type="button" onClick={closeModal}>
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
