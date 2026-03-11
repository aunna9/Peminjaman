import { useEffect, useMemo, useState } from "react";
import "./peminjam.css";
import Sidebar from "./sidebar";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const API = `${BASE_URL}/api`;

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

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
const isReturned = (p) => {
  const s = String(p?.status || "").toLowerCase();
  return s.includes("dikembalikan") || s.includes("selesai") || s.includes("kembali");
};

const isActiveForLate = (p) => {
  const s = String(p?.status || "").toLowerCase();
  if (isReturned(p)) return false;
  if (s === "dipinjam") return true;
  if (s.includes("menunggu pengembalian")) return true;
  return false;
};

const isLateByDate = (p) => {
  if (!isActiveForLate(p)) return false;

  const due = p?.tanggal_kembali || p?.tglKembali || p?.tgl_kembali_rencana;
  if (!due) return false;

  const dueDate = new Date(due);
  if (isNaN(dueDate.getTime())) return false;

  dueDate.setHours(23, 59, 59, 999);
  return new Date() > dueDate;
};

const displayStatus = (p) => (isLateByDate(p) ? "terlambat" : p?.status || "-");

const DENDA_PER_HARI = 2000;

const rupiah = (n) => Number(n || 0).toLocaleString("id-ID");

const hitungTerlambatHariFront = (p) => {
  const statusDb = String(p?.status || "").toLowerCase();
  const due = p?.tanggal_kembali || p?.tglKembali || p?.tgl_kembali_rencana;
  if (!due) return 0;

  if (!["dipinjam", "terlambat", "menunggu pengembalian"].includes(statusDb)) return 0;

  const dueDate = new Date(due);
  if (isNaN(dueDate.getTime())) return 0;

  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  const diffMs = todayDateOnly - dueDateOnly;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

const getStatusTampil = (p) => {
  const statusDb = String(p?.status || "").toLowerCase();
  const terlambatHari = p?.terlambatHari ?? hitungTerlambatHariFront(p);

  if (statusDb === "menunggu pengembalian") return "menunggu pengembalian";
  if (terlambatHari > 0 && ["dipinjam", "terlambat"].includes(statusDb)) return "terlambat";
  return p?.status || "-";
};

const todayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function PeminjamPage() {
  const [tab, setTab] = useState("alat");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [formBulk, setFormBulk] = useState({
    tgl_pinjam: "",
    tgl_kembali_rencana: "",
    no_hp: "",
    keperluan: "",
  });

  const [showDetail, setShowDetail] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const [kategoriList, setKategoriList] = useState([]);
  const [alatList, setAlatList] = useState([]);
  const [pinjamanSaya, setPinjamanSaya] = useState([]);

  const [kategoriId, setKategoriId] = useState("");
  const [qAlat, setQAlat] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [alatDipilih, setAlatDipilih] = useState(null);
  const [formPinjam, setFormPinjam] = useState({
    jumlah: 1,
    tgl_pinjam: "",
    tgl_kembali_rencana: "",
    no_hp: "",
    keperluan: "",
  });

  const kategoriMap = useMemo(() => {
    const entries = kategoriList.map((k) => [k.id_kategori, k.nama_kategori]);
    return Object.fromEntries(entries);
  }, [kategoriList]);

  const adaKeterlambatan = useMemo(() => {
    return pinjamanSaya.some((p) => String(displayStatus(p)).toLowerCase() === "terlambat");
  }, [pinjamanSaya]);

  const filteredAlatList = useMemo(() => {
    const kw = qAlat.trim().toLowerCase();
    if (!kw) return alatList;

    return alatList.filter((a) => {
      const nama = String(a.nama_alat ?? "").toLowerCase();
      const kat = String(a.nama_kategori ?? kategoriMap[a.id_kategori] ?? "").toLowerCase();
      const kondisi = String(a.kondisi ?? "").toLowerCase();

      return (
        nama.includes(kw) ||
        kat.includes(kw) ||
        kondisi.includes(kw) ||
        String(a.stok ?? "").includes(kw)
      );
    });
  }, [alatList, qAlat, kategoriMap]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const addToCart = (alat) => {
    setError("");
    setCart((prev) => {
      const found = prev.find((x) => x.id_alat === alat.id_alat);

      if (found) {
        return prev.map((x) =>
          x.id_alat === alat.id_alat
            ? { ...x, jumlah: Math.min((x.jumlah || 1) + 1, alat.stok || 999) }
            : x
        );
      }

      return [
        ...prev,
        {
          id_alat: alat.id_alat,
          nama_alat: alat.nama_alat,
          stok: alat.stok,
          jumlah: 1,
        },
      ];
    });

    showToast("Ditambahkan ke keranjang");
  };

  const removeFromCart = (id_alat) => {
    setCart((prev) => prev.filter((x) => x.id_alat !== id_alat));
  };

  const updateCartQty = (id_alat, qty) => {
    setCart((prev) =>
      prev.map((x) =>
        x.id_alat === id_alat
          ? { ...x, jumlah: Math.max(1, Math.min(Number(qty || 1), x.stok || 999)) }
          : x
      )
    );
  };

  const clearCart = () => setCart([]);

  const openDetailModal = (p) => {
    setDetailData(p);
    setShowDetail(true);
  };

  const closeDetailModal = () => {
    setShowDetail(false);
    setDetailData(null);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  const openModalPinjam = (alat) => {
    setError("");
    setAlatDipilih(alat);
    setFormPinjam({
      jumlah: 1,
      tgl_pinjam: todayStr(),
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

  /* ================= FETCH ================= */

  const fetchKategori = async () => {
    try {
      setError("");
      const res = await fetch(`${API}/kategori`, { headers: getAuthHeaders() });
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

      const res = await fetch(`${API}/peminjam/me`, {
        headers: getAuthHeaders(),
      });

      const text = await res.text();
      let json = {};
      try {
        json = JSON.parse(text);
      } catch {}

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
    if (tab === "alat") fetchAlat(kategoriId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kategoriId, tab]);

  useEffect(() => {
    if (tab === "pinjaman") fetchPinjamanSaya();
  }, [tab]);

  useEffect(() => {
    if (showCart) {
      setFormBulk((prev) => ({
        ...prev,
        tgl_pinjam: prev.tgl_pinjam || todayStr(),
      }));
    }
  }, [showCart]);

  /* ================= SUBMIT ================= */

  const submitAjukan = async (e) => {
    e.preventDefault();
    setError("");

    if (!alatDipilih) return setError("Alat belum dipilih");

    if (formPinjam.tgl_pinjam < todayStr()) {
      return setError("Tanggal pinjam tidak boleh sebelum hari ini");
    }

    if (
      formPinjam.tgl_kembali_rencana &&
      formPinjam.tgl_kembali_rencana < formPinjam.tgl_pinjam
    ) {
      return setError("Tanggal kembali tidak boleh sebelum tanggal pinjam");
    }

    const payload = {
      id_alat: alatDipilih.id_alat,
      jumlah: Number(formPinjam.jumlah),
      tanggal_pinjam: formPinjam.tgl_pinjam,
      tanggal_kembali: formPinjam.tgl_kembali_rencana,
      no_hp: formPinjam.no_hp,
      keperluan: formPinjam.keperluan,
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

      if (!res.ok) {
        setError(json.message || "Gagal mengajukan peminjaman");
        return;
      }

      setShowModal(false);
      showToast("Pengajuan berhasil");
      setTab("pinjaman");

      setTimeout(() => {
        fetchPinjamanSaya();
        fetchAlat(kategoriId);
      }, 300);
    } catch {
      setError("Terjadi kesalahan koneksi");
    }
  };

  const submitAjukanBanyak = async (e) => {
    e.preventDefault();
    setError("");

    if (cart.length === 0) return setError("Keranjang kosong");

    if (formBulk.tgl_pinjam < todayStr()) {
      return setError("Tanggal pinjam tidak boleh sebelum hari ini");
    }

    if (
      formBulk.tgl_kembali_rencana &&
      formBulk.tgl_kembali_rencana < formBulk.tgl_pinjam
    ) {
      return setError("Tanggal kembali tidak boleh sebelum tanggal pinjam");
    }

    const payload = {
      tanggal_pinjam: formBulk.tgl_pinjam,
      tanggal_kembali: formBulk.tgl_kembali_rencana,
      no_hp: formBulk.no_hp,
      keperluan: formBulk.keperluan,
      items: cart.map((it) => ({
        id_alat: it.id_alat,
        jumlah: Number(it.jumlah || 1),
      })),
    };

    try {
      const res = await fetch(`${API}/peminjaman/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.message || "Gagal mengajukan peminjaman");
        return;
      }

      showToast("Pengajuan berhasil!");
      setShowCart(false);
      clearCart();
      setFormBulk({
        tgl_pinjam: "",
        tgl_kembali_rencana: "",
        no_hp: "",
        keperluan: "",
      });
      setTab("pinjaman");

      setTimeout(() => {
        fetchPinjamanSaya();
        fetchAlat(kategoriId);
      }, 300);
    } catch {
      setError("Terjadi kesalahan koneksi");
    }
  };

  const handleKembalikan = async (id) => {
    try {
      setError("");

      const res = await fetch(`${API}/peminjaman/${id}/kembalikan`, {
        method: "PUT",
        headers: { ...getAuthHeaders() },
      });

      const text = await res.text();
      let json = {};
      try {
        json = JSON.parse(text);
      } catch {}

      if (!res.ok) {
        setError(json.message || text || "Gagal mengembalikan");
        return;
      }

      showToast("Permintaan pengembalian dikirim (menunggu konfirmasi admin)");
      fetchPinjamanSaya();
    } catch (e) {
      setError(e?.message || "Gagal mengembalikan");
    }
  };

  return (
    <div className="peminjam-layout-wrapper" style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar currentTab={tab} setTab={setTab} />

      <div
        className="peminjam-main-content peminjam-container"
        style={{ flex: 1, padding: "20px", backgroundColor: "#f8f9fa" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h1 className="peminjam-title" style={{ margin: 0 }}>
            PEMINJAMAN LABORATORIUM SEKOLAH
          </h1>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn-outline" onClick={() => setShowCart(true)}>
              🛒 Keranjang ({cart.length})
            </button>
          </div>
        </div>

        {toast && <div className="toast-success">{toast}</div>}
        {error && <div className="alert-error">{error}</div>}

        {tab === "alat" && (
          <div className="card">
            <select className="select" value={kategoriId} onChange={(e) => setKategoriId(e.target.value)}>
              <option value="">Semua Kategori</option>
              {kategoriList.map((k) => (
                <option key={k.id_kategori} value={k.id_kategori}>
                  {k.nama_kategori}
                </option>
              ))}
            </select>

            <div className="alat-toolbar">
              <input
                className="alat-search"
                type="text"
                placeholder="Cari alat/kategori/kondisi/stok..."
                value={qAlat}
                onChange={(e) => setQAlat(e.target.value)}
              />

              {qAlat && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setQAlat("")}
                  title="Reset pencarian"
                >
                  Reset
                </button>
              )}
            </div>

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
                {filteredAlatList.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: 16 }}>
                      Data tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredAlatList.map((a) => (
                    <tr key={a.id_alat}>
                      <td>{a.nama_alat}</td>
                      <td>{a.nama_kategori || kategoriMap[a.id_kategori] || a.id_kategori}</td>
                      <td>{a.stok}</td>
                      <td>{a.kondisi}</td>
                      <td>
                        <button className="btn-primary" onClick={() => addToCart(a)}>
                          + Keranjang
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
            {adaKeterlambatan && (
              <div
                style={{
                  backgroundColor: "#fff5f5",
                  borderLeft: "5px solid #ff4d4f",
                  padding: "15px",
                  marginBottom: "20px",
                  borderRadius: "4px",
                  color: "#852626",
                }}
              >
                <strong style={{ display: "block", marginBottom: "5px" }}>
                  ⚠️ Peringatan Keterlambatan!
                </strong>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  Anda memiliki alat yang belum dikembalikan melewati batas waktu. Harap segera
                  mengembalikan alat ke laboratorium untuk menghindari denda yang terus bertambah.
                </p>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              <button className="btn-outline" onClick={fetchPinjamanSaya}>
                🔄 Refresh
              </button>
            </div>

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
                {pinjamanSaya.map((p) => {
                  const id = p.id_peminjaman ?? p.id;
                  const st = displayStatus(p);
                  const stLower = String(st).toLowerCase();
                  const isLate = stLower === "terlambat";

                  return (
                    <tr
                      key={id}
                      style={isLate ? { backgroundColor: "#fff1f0", transition: "0.3s" } : {}}
                    >
                      <td>{p.nama_alat || p.nama_alat_dipinjam || "-"}</td>
                      <td>{p.jumlah ?? 1}</td>
                      <td style={isLate ? { color: "#cf1322", fontWeight: "bold" } : {}}>
                        {st} {isLate && " (Segera Kembalikan!)"}
                      </td>
                      <td>
                        <button className="btn-outline" onClick={() => openDetailModal(p)}>
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {pinjamanSaya.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: 16 }}>
                      Belum ada data pinjaman.
                    </td>
                  </tr>
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
                      min={todayStr()}
                      onFocus={(e) => e.target.showPicker?.()}
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
                      min={formPinjam.tgl_pinjam || todayStr()}
                      onFocus={(e) => e.target.showPicker?.()}
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
                    onChange={(e) => setFormPinjam({ ...formPinjam, no_hp: e.target.value })}
                    required
                  />
                  <small className="hint">Untuk konfirmasi</small>
                </div>

                <div className="form-group">
                  <label>Keperluan</label>
                  <textarea
                    placeholder="Contoh: Praktikum / TA / Penelitian"
                    value={formPinjam.keperluan}
                    onChange={(e) => setFormPinjam({ ...formPinjam, keperluan: e.target.value })}
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

        {showDetail && detailData && (
          <div className="modal-overlay" onClick={closeDetailModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Detail Peminjaman</h3>

              <div className="detail-list" style={{ color: "#111" }}>
                <p>
                  <strong>Nama Alat:</strong> {detailData?.nama_alat || "-"}
                </p>
                <p>
                  <strong>Tanggal Pinjam:</strong>{" "}
                  {detailData?.tanggal_pinjam || detailData?.tglPinjam || "-"}
                </p>
                <p>
                  <strong>Tanggal Kembali:</strong>{" "}
                  {detailData?.tanggal_kembali || detailData?.tglKembali || "-"}
                </p>

                <p>
                  <strong>Status:</strong> {detailData?.statusTampil || getStatusTampil(detailData)}
                </p>

                {(() => {
                  const telatHari = Number(
                    detailData?.terlambatHari ?? hitungTerlambatHariFront(detailData)
                  );
                  const denda = Number(detailData?.denda ?? telatHari * DENDA_PER_HARI);

                  return (
                    <>
                      <p>
                        <strong>Terlambat:</strong> {telatHari} hari
                      </p>
                      <p>
                        <strong>Denda:</strong> Rp {rupiah(denda)}
                      </p>
                    </>
                  );
                })()}

                {String(detailData?.status || "").toLowerCase() === "ditolak" && (
                  <p style={{ color: "#b00020" }}>
                    <strong>Alasan Ditolak:</strong> {detailData?.alasan_tolak || "-"}
                  </p>
                )}
              </div>

              <div className="modal-actions">
                {(detailData.status === "dipinjam" ||
                  displayStatus(detailData) === "terlambat") && (
                  <button
                    className="btn-primary"
                    onClick={() => {
                      handleKembalikan(detailData.id_peminjaman || detailData.id);
                      closeDetailModal();
                    }}
                  >
                    Kembalikan
                  </button>
                )}

                <button className="btn-secondary" onClick={closeDetailModal}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {showCart && (
          <div className="modal-overlay" onClick={() => setShowCart(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Keranjang Peminjaman</h3>

              {cart.length === 0 ? (
                <p>Keranjang masih kosong.</p>
              ) : (
                <>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Alat</th>
                        <th>Qty</th>
                        <th>Stok</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((it) => (
                        <tr key={it.id_alat}>
                          <td>{it.nama_alat}</td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              max={it.stok || 999}
                              value={it.jumlah}
                              onChange={(e) => updateCartQty(it.id_alat, e.target.value)}
                            />
                          </td>
                          <td>{it.stok}</td>
                          <td>
                            <button
                              className="btn-outline"
                              type="button"
                              onClick={() => removeFromCart(it.id_alat)}
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <form onSubmit={submitAjukanBanyak} className="modal-form" style={{ marginTop: 12 }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Tgl Pinjam</label>
                        <input
                          type="date"
                          value={formBulk.tgl_pinjam}
                          min={todayStr()}
                          onFocus={(e) => e.target.showPicker?.()}
                          onChange={(e) =>
                            setFormBulk({ ...formBulk, tgl_pinjam: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Tgl Kembali</label>
                        <input
                          type="date"
                          value={formBulk.tgl_kembali_rencana}
                          min={formBulk.tgl_pinjam || todayStr()}
                          onFocus={(e) => e.target.showPicker?.()}
                          onChange={(e) =>
                            setFormBulk({
                              ...formBulk,
                              tgl_kembali_rencana: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>No HP</label>
                      <input
                        type="tel"
                        value={formBulk.no_hp}
                        onChange={(e) => setFormBulk({ ...formBulk, no_hp: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Keperluan</label>
                      <textarea
                        rows={2}
                        value={formBulk.keperluan}
                        onChange={(e) => setFormBulk({ ...formBulk, keperluan: e.target.value })}
                      />
                    </div>

                    <div className="modal-actions">
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => setShowCart(false)}
                      >
                        Tutup
                      </button>

                      <button className="btn-outline" type="button" onClick={clearCart}>
                        Kosongkan
                      </button>

                      <button className="btn-primary" type="submit">
                        Ajukan
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}