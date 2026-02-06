const koneksi = require("../models/db");

const DENDA_PER_HARI = 2000; // silakan ubah

function diffDays(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const ms = b - a;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

exports.index = async (req, res) => {
  try {
    // ambil data peminjaman + join user & alat
const [rows] = await db.query(`
  SELECT
    p.id_peminjaman AS id,
    u.username AS peminjam,
    '-' AS kelas,                 -- ✅ tidak ambil dari DB
    a.nama_alat AS alat,
    1 AS qty,
    p.tanggal_pinjam AS tglPinjam,
    p.tanggal_kembali AS tglKembali,
    p.status,
    p.created_at
  FROM peminjaman p
  JOIN users u ON u.id_user = p.id_user
  JOIN alat a ON a.id_alat = p.id_alat
  ORDER BY p.created_at DESC
`);


    const today = new Date();

    const mapped = rows.map((r) => {
      const status = String(r.status || "").toLowerCase();

      // hitung telat hanya kalau belum dikembalikan
      let terlambatHari = 0;
      if (r.tglKembali && status !== "dikembalikan") {
        terlambatHari = Math.max(0, diffDays(r.tglKembali, today));
      }

      const denda = terlambatHari * DENDA_PER_HARI;

      // buat status tampilan telat (opsional)
      let statusTampil = r.status || "dipinjam";
      if (status !== "dikembalikan" && terlambatHari > 0) statusTampil = "terlambat";

      return {
        ...r,
        status: statusTampil,
        terlambatHari,
        denda,
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal ambil data pengembalian" });
  }
};

const db = require("../models/db");

exports.konfirmasi = async (req, res) => {
  const { id } = req.params;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // ambil data peminjaman + lock row
    const [rows] = await conn.query(
      `SELECT id_alat, status
       FROM peminjaman
       WHERE id_peminjaman = ?
       FOR UPDATE`,
      [id]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Data peminjaman tidak ditemukan" });
    }

    const id_alat = rows[0].id_alat;
    const oldStatus = String(rows[0].status || "").toLowerCase();

    // ✅ cegah stok naik berkali-kali kalau sudah dikembalikan
    if (oldStatus === "dikembalikan") {
      await conn.rollback();
      return res.json({ message: "Sudah dikembalikan sebelumnya" });
    }

    // update status jadi dikembalikan
    await conn.query(
      "UPDATE peminjaman SET status = 'dikembalikan' WHERE id_peminjaman = ?",
      [id]
    );

    // ✅ balikin stok +1 (yang sebelumnya kepotong saat status jadi dipinjam)
    await conn.query(
      "UPDATE alat SET stok = stok + 1 WHERE id_alat = ?",
      [id_alat]
    );

    await conn.commit();
    return res.json({ message: "Pengembalian dikonfirmasi & stok bertambah" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ message: "Gagal konfirmasi pengembalian" });
  } finally {
    conn.release();
  }
};


// ⚠️ kalau kamu belum punya kolom/fitur pembayaran denda, route ini mending DIHAPUS dulu
exports.setDendaLunas = async (req, res) => {
  return res.status(400).json({
    message:
      "Fitur pelunasan belum tersedia karena tabel peminjaman belum punya kolom denda/denda_status.",
  });
};
