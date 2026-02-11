const db = require("../models/db");

const DENDA_PER_HARI = 2000; // silakan ubah

exports.index = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        p.id_peminjaman AS id,
        u.username AS peminjam,
        '-' AS kelas,
        a.nama_alat AS alat,
        1 AS qty,
        p.tanggal_pinjam AS tglPinjam,
        p.tanggal_kembali AS tglKembali,
        p.status,
        p.created_at,

        CASE
          WHEN LOWER(p.status) IN ('dipinjam','terlambat','menunggu pengembalian')
               AND p.tanggal_kembali IS NOT NULL
          THEN GREATEST(0, DATEDIFF(CURDATE(), DATE(p.tanggal_kembali)))
          ELSE 0
        END AS terlambatHari

      FROM peminjaman p
      JOIN users u ON u.id_user = p.id_user
      JOIN alat a ON a.id_alat = p.id_alat
      ORDER BY p.created_at DESC
    `);

    const mapped = rows.map((r) => {
      const statusDb = String(r.status || "").toLowerCase();

      const denda =
        ["dipinjam", "terlambat", "menunggu pengembalian"].includes(statusDb)
          ? Number(r.terlambatHari || 0) * DENDA_PER_HARI
          : 0;

const statusTampil =
  statusDb === "menunggu pengembalian"
    ? "menunggu pengembalian"
    : (Number(r.terlambatHari || 0) > 0 && ["dipinjam", "terlambat"].includes(statusDb))
      ? "terlambat"
      : r.status;

      return { ...r, statusTampil, denda };
    });

    return res.json(mapped); // ✅ WAJIB
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Gagal ambil data pengembalian" });
  }
};

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
