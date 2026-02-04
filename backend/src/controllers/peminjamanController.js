const Peminjaman = require('../models/peminjaman')
const db = require('../models/db');

exports.index = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        p.id_peminjaman,
        u.username AS nama_peminjam,
        p.no_hp,
        p.id_alat,
        a.nama_alat,
        1 AS jumlah,
        p.tanggal_pinjam,
        p.tanggal_kembali,
        p.status,
        p.created_at
      FROM peminjaman p
      JOIN users u ON u.id_user = p.id_user
      JOIN alat a ON a.id_alat = p.id_alat
      ORDER BY p.created_at DESC
      LIMIT 25
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal ambil data peminjaman" });
  }
};

exports.create = async (req, res) => {
  try {
    console.log("--> Request Masuk");
    const userId = req.user?.id; // PASTIKAN PAKAI .id SESUAI TOKEN
    const { id_alat, tanggal_pinjam, tanggal_kembali, no_hp } = req.body;

    console.log("--> Data User ID:", userId);
    if (!userId) return res.status(401).json({ message: "Unauthorized (No User ID)" });

    console.log("--> Menjalankan Query...");
    const [result] = await db.query(
      `INSERT INTO peminjaman (id_user, id_alat, no_hp, tanggal_pinjam, tanggal_kembali, status)
       VALUES (?, ?, ?, ?, ?, 'menunggu')`,
      [userId, id_alat, no_hp, tanggal_pinjam, tanggal_kembali || null]
    );

    console.log("--> Berhasil Simpan ID:", result.insertId);
    return res.status(201).json({
      message: "Peminjaman berhasil diajukan",
      id_peminjaman: result.insertId,
    });
  } catch (err) {
    console.error("❌ ERROR SERVER:", err.message);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.show = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT p.*, u.username AS nama_peminjam, a.nama_alat
       FROM peminjaman p
       JOIN users u ON u.id_user=p.id_user
       JOIN alat a ON a.id_alat=p.id_alat
       WHERE p.id_peminjaman=? LIMIT 1`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ message: "Data tidak ditemukan" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;

    if (!status) return res.status(400).json({ message: "Status wajib diisi" });

    status = String(status).toLowerCase();
    const allowed = ["menunggu", "dipinjam", "dikembalikan", "ditolak", "terlambat"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Status tidak valid" });
    }

    // ambil data lama
    const [oldRows] = await db.query(
      "SELECT id_alat, status FROM peminjaman WHERE id_peminjaman=?",
      [id]
    );

    if (oldRows.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const id_alat = oldRows[0].id_alat;
    const oldStatus = String(oldRows[0].status || "").toLowerCase();

    // ✅ kalau dari MENUNGGU menjadi DIPINJAM → cek stok lalu kurangi 1
    if (oldStatus === "menunggu" && status === "dipinjam") {
      const [alatRows] = await db.query("SELECT stok FROM alat WHERE id_alat=?", [id_alat]);
      if (alatRows.length === 0) return res.status(404).json({ message: "Alat tidak ditemukan" });
      if (Number(alatRows[0].stok) < 1) return res.status(400).json({ message: "Stok alat habis" });

      await db.query("UPDATE alat SET stok = stok - 1 WHERE id_alat=?", [id_alat]);
    }

    const [result] = await db.query(
      "UPDATE peminjaman SET status=? WHERE id_peminjaman=?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    return res.json({ message: "Status berhasil diupdate" });
  } catch (err) {
    console.error("UPDATE PEMINJAMAN ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/peminjaman/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    // ambil dulu data peminjaman
    const [rows] = await db.query(
      "SELECT id_alat, status FROM peminjaman WHERE id_peminjaman=?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const id_alat = rows[0].id_alat;
    const st = String(rows[0].status || "").toLowerCase();

    // hapus
    const [result] = await db.query(
      "DELETE FROM peminjaman WHERE id_peminjaman=?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    // ✅ kalau yang dihapus statusnya dipinjam, balikin stok +1
    if (st === "dipinjam") {
      await db.query("UPDATE alat SET stok = stok + 1 WHERE id_alat=?", [id_alat]);
    }

    return res.json({ message: "Data berhasil dihapus" });
  } catch (err) {
    console.error("REMOVE PEMINJAMAN ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};