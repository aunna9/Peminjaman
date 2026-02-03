const Peminjaman = require('../models/peminjaman')
const db = require('../models/db');

exports.index = async (req, res) => {
  console.log("✅ INDEX PEMINJAMAN HIT");
  try {
    const [rows] = await db.query(`
      SELECT
        p.id_peminjaman,
        p.id_user,
        u.username AS peminjam,
        p.id_alat,
        a.nama_alat AS alat,
        p.tanggal_pinjam,
        p.tanggal_kembali,
        p.status,
        p.created_at
      FROM peminjaman p
      LEFT JOIN users u ON u.id_user = p.id_user
      LEFT JOIN alat a ON a.id_alat = p.id_alat
      ORDER BY p.id_peminjaman DESC
    `);

    return res.json({ data: rows });
  } catch (err) {
    console.error("INDEX PEMINJAMAN ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const userId = req.user?.id; // ✅ middleware kamu: req.user.id
    const { id_alat, tanggal_pinjam, tanggal_kembali, jumlah } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!id_alat || !tanggal_pinjam) {
      return res.status(400).json({ message: "Data belum lengkap" });
    }

    // cek stok alat
    const [alatRows] = await db.query(
      "SELECT stok FROM alat WHERE id_alat = ?",
      [id_alat]
    );
    if (alatRows.length === 0) {
      return res.status(404).json({ message: "Alat tidak ditemukan" });
    }

    const qty = Number(jumlah || 1);
    if (qty < 1) return res.status(400).json({ message: "Jumlah minimal 1" });
    if (Number(alatRows[0].stok) < qty) {
      return res.status(400).json({ message: "Stok alat habis / kurang" });
    }

    // insert peminjaman (sesuai kolom DB kamu)
    const [result] = await db.query(
      `INSERT INTO peminjaman (id_user, id_alat, tanggal_pinjam, tanggal_kembali, status)
       VALUES (?, ?, ?, ?, 'dipinjam')`,
      [userId, id_alat, tanggal_pinjam, tanggal_kembali || null]
    );

    // kurangi stok
    await db.query(
      "UPDATE alat SET stok = stok - ? WHERE id_alat = ?",
      [qty, id_alat]
    );

    return res.status(201).json({
      message: "Peminjaman berhasil diajukan",
      id_peminjaman: result.insertId,
    });
  } catch (err) {
    console.error("CREATE PEMINJAMAN ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.show = (req, res) => {
    const id = req.params.id;
    Peminjaman.getById(id, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results[0]);
    })
}

exports.store = (req, res) => {
  const data = req.body;

  // ambil stok, bukan jumlah
  const cekStok = "SELECT stok FROM alat WHERE id_alat = ?";
  db.query(cekStok, [data.alat_id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Alat tidak ditemukan" });
    }

    if (result[0].stok < 1) {
      return res.status(400).json({ message: "Stok alat habis" });
    }

    const insertPeminjaman = "INSERT INTO peminjaman SET ?";
    const updateStok = "UPDATE alat SET stok = stok - 1 WHERE id_alat = ?";

    db.query(insertPeminjaman, data, (err) => {
      if (err) return res.status(500).json(err);

      db.query(updateStok, [data.alat_id], (err) => {
        if (err) return res.status(500).json(err);

        res.json({ message: "Peminjaman berhasil" });
      });
    });
  });
};

exports.updateStatus = (req, res) => {
  const { status } = req.body;
  const id = req.params.id;

  // normalisasi status biar gak case sensitive
  const st = (status || "").toLowerCase();

  // update status dulu
  const updateStatusSql = "UPDATE peminjaman SET status = ? WHERE id_peminjaman = ?";
  db.query(updateStatusSql, [status, id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data peminjaman tidak ditemukan" });
    }

    // kalau bukan pengembalian, selesai
    if (st !== "dikembalikan") {
      return res.json({ message: "Status peminjaman berhasil diupdate" });
    }

    // ambil alat_id dari peminjaman (lebih aman)
    const getAlat = "SELECT alat_id FROM peminjaman WHERE id_peminjaman = ?";
    db.query(getAlat, [id], (err, rows) => {
      if (err) return res.status(500).json(err);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Data peminjaman tidak ditemukan" });
      }

      const alatId = rows[0].alat_id;

      // balikin stok (pakai stok dan id_alat biar konsisten sama store)
      const tambahStok = "UPDATE alat SET stok = stok + 1 WHERE id_alat = ?";
      db.query(tambahStok, [alatId], (err) => {
        if (err) return res.status(500).json(err);

        res.json({ message: "Alat berhasil dikembalikan (stok bertambah)" });
      });
    });
  });
};


exports.destroy = (req, res) => {
    const id = req.params.id;
    Peminjaman.delete(id, (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Data peminjaman dihapus" });
    })
}