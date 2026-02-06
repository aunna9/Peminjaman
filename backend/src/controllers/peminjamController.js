const db = require("../models/db");

// POST /api/peminjam
exports.ajukan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id_alat, tgl_pinjam, tgl_kembali } = req.body;

    if (!id_alat || !tgl_pinjam) {
      return res.status(400).json({ message: "Data belum lengkap" });
    }

    // 1. Cek apakah alat ada DAN cek stoknya cukup
    const [alatRows] = await db.query(
      "SELECT id_alat, stok FROM alat WHERE id_alat = ?",
      [id_alat]
    );

    if (alatRows.length === 0) {
      return res.status(404).json({ message: "Alat tidak ditemukan" });
    }

    // Tambahan: Cegah pinjam jika stok habis
    if (alatRows[0].stok <= 0) {
      return res.status(400).json({ message: "Stok alat sedang habis" });
    }

    // Mulai transaksi agar data konsisten
    await db.query("START TRANSACTION");

    // 2. Insert ke tabel peminjaman
    const [result] = await db.query(
      `INSERT INTO peminjaman
        (id_user, id_alat, tanggal_pinjam, tanggal_kembali, status)
       VALUES (?, ?, ?, ?, 'dipinjam')`,
      [userId, id_alat, tgl_pinjam, tgl_kembali || null]
    );

    // 3. DI SINI LOGIKANYA: Kurangi stok alat tersebut
    await db.query(
      "UPDATE alat SET stok = stok - 1 WHERE id_alat = ?",
      [id_alat]
    );

    await db.query("COMMIT");

    res.status(201).json({
      message: "Peminjaman berhasil diajukan dan stok berkurang",
      id_peminjaman: result.insertId,
    });
  } catch (err) {
    await db.query("ROLLBACK"); // Batalkan jika ada error
    console.error("ajukan error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/peminjam/me
exports.getMine = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT 
          p.id_peminjaman,
          p.id_alat,
          a.nama_alat,
          p.tanggal_pinjam,
          p.tanggal_kembali,
          p.status,
          p.created_at
       FROM peminjaman p
       JOIN alat a ON a.id_alat = p.id_alat
       WHERE p.id_user = ?
       ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json({ data: rows });
  } catch (err) {
    console.error("getMine error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/peminjam/:id/kembalikan
exports.kembalikan = async (req, res) => {
  const idPeminjaman = Number(req.params.id);
  const userId = req.user?.id;

  if (!idPeminjaman) return res.status(400).json({ message: "ID peminjaman tidak valid" });
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const conn = await db.getConnection(); // kalau kamu pakai mysql2 pool
  try {
    await conn.beginTransaction();

    // 1) ambil data peminjaman
    const [rows] = await conn.query(
      `SELECT id_peminjaman, id_user, id_alat, status
       FROM peminjaman
       WHERE id_peminjaman = ?
       LIMIT 1`,
      [idPeminjaman]
    );

    const pinjam = rows?.[0];
    if (!pinjam) {
      await conn.rollback();
      return res.status(404).json({ message: "Data peminjaman tidak ditemukan" });
    }

    // 2) pastikan peminjaman milik user yang login
    if (Number(pinjam.id_user) !== Number(userId)) {
      await conn.rollback();
      return res.status(403).json({ message: "Forbidden (bukan pemilik peminjaman)" });
    }

    // 3) pastikan status masih dipinjam
    const statusNow = String(pinjam.status || "").toLowerCase();
    if (statusNow !== "dipinjam") {
      await conn.rollback();
      return res.status(400).json({ message: "Tidak bisa dikembalikan karena status bukan 'dipinjam'" });
    }

    // 4) update status peminjaman -> dikembalikan
    await conn.query(
      `UPDATE peminjaman
       SET status = 'dikembalikan',
           tanggal_kembali = COALESCE(tanggal_kembali, NOW())
       WHERE id_peminjaman = ?`,
      [idPeminjaman]
    );

    // 5) balikin stok alat (+1)
    await conn.query(
      `UPDATE alat
       SET stok = stok + 1
       WHERE id_alat = ?`,
      [pinjam.id_alat]
    );

    await conn.commit();
    return res.json({ message: "Berhasil dikembalikan", id_peminjaman: idPeminjaman });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error("ERROR kembalikan:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    conn.release();
  }
};
