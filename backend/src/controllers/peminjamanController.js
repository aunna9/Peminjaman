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
        p.alasan_tolak,
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
    const userId = req.user?.id || req.user?.id_user;
    // JANGAN ambil keperluan dari req.body jika kolomnya tidak ada di DB
    const { id_alat, tanggal_pinjam, tanggal_kembali, no_hp } = req.body;

    if (!userId) return res.status(401).json({ message: "Sesi habis" });

    // Query INSERT tanpa kolom keperluan
    const [result] = await db.query(
      `INSERT INTO peminjaman (id_user, id_alat, no_hp, tanggal_pinjam, tanggal_kembali, status)
       VALUES (?, ?, ?, ?, ?, 'menunggu')`,
      [userId, id_alat, no_hp, tanggal_pinjam, tanggal_kembali || null]
    );

    return res.status(201).json({ message: "Berhasil!", id: result.insertId });
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    // WAJIB ADA RESPONSE AGAR TIDAK PENDING
    return res.status(500).json({ message: "Gagal simpan", error: err.message });
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
    const id = req.params.id;
    const status = String(req.body?.status || "").toLowerCase();
    const alasan = String(req.body?.alasan_tolak || req.body?.alasan || "").trim();

    if (!id) return res.status(400).json({ message: "ID tidak valid" });
    if (!status) return res.status(400).json({ message: "Status wajib diisi" });

    // aturan: kalau ditolak, wajib ada alasan
    if (status === "ditolak" && !alasan) {
      return res.status(400).json({ message: "Alasan penolakan wajib diisi" });
    }

    // kalau status bukan ditolak, kosongkan alasan (opsional biar rapih)
    const alasanFinal = status === "ditolak" ? alasan : null;

    const [result] = await db.query(
      `UPDATE peminjaman SET status = ?, alasan_tolak = ? WHERE id_peminjaman = ?`,
      [status, alasanFinal, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data peminjaman tidak ditemukan" });
    }

    return res.json({ message: "Berhasil update", status, alasan_tolak: alasanFinal });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
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

exports.requestReturn = async (req, res) => {
  const id = Number(req.params.id);
  const userId = Number(req.user?.id_user ?? req.user?.id);

  if (!id) return res.status(400).json({ message: "ID tidak valid" });
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const [[row]] = await db.query(
    "SELECT id_user, status FROM peminjaman WHERE id_peminjaman=?",
    [id]
  );

  if (!row) return res.status(404).json({ message: "Data tidak ditemukan" });
  if (Number(row.id_user) !== userId) return res.status(403).json({ message: "Bukan peminjaman kamu" });

  const st = String(row.status || "").toLowerCase();

  // status DB yang valid untuk minta pengembalian
  const allowed = ["dipinjam"]; // telat itu status tampilan, bukan status DB
  if (!allowed.includes(st)) {
    return res.status(400).json({ message: `Tidak bisa kembalikan dari status: ${st}` });
  }

  await db.query(
    "UPDATE peminjaman SET status=? WHERE id_peminjaman=?",
    ["menunggu pengembalian", id]
  );

  return res.json({ message: "Menunggu konfirmasi admin." });
};

