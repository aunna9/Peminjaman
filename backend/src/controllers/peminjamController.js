const db = require("../models/db");

// POST /api/peminjam
exports.ajukan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id_alat, tgl_pinjam, tgl_kembali } = req.body;

    if (!id_alat || !tgl_pinjam) {
      return res.status(400).json({ message: "Data belum lengkap" });
    }

    const [alatRows] = await db.query(
      "SELECT id_alat FROM alat WHERE id_alat = ?",
      [id_alat]
    );
    if (alatRows.length === 0) {
      return res.status(404).json({ message: "Alat tidak ditemukan" });
    }

    const [result] = await db.query(
      `INSERT INTO peminjaman
        (id_user, id_alat, tanggal_pinjam, tanggal_kembali, status)
       VALUES (?, ?, ?, ?, 'dipinjam')`,
      [userId, id_alat, tgl_pinjam, tgl_kembali || null]
    );

    res.status(201).json({
      message: "Peminjaman berhasil diajukan",
      id_peminjaman: result.insertId,
    });
  } catch (err) {
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
  try {
    const userId = req.user.id;
    const id = req.params.id;

    const [rows] = await db.query(
      `SELECT status FROM peminjaman 
       WHERE id_peminjaman = ? AND id_user = ?`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    if (rows[0].status === "dikembalikan") {
      return res.status(400).json({ message: "Sudah dikembalikan" });
    }

    await db.query(
      `UPDATE peminjaman
       SET status = 'dikembalikan', tanggal_kembali = CURDATE()
       WHERE id_peminjaman = ?`,
      [id]
    );

    res.json({ message: "Alat berhasil dikembalikan" });
  } catch (err) {
    console.error("kembalikan error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
