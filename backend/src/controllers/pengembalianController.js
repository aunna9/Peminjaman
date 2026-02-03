const db = require("../models/db");

// GET /api/peminjaman
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM peminjaman ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal ambil data peminjaman" });
  }
};

// PUT /api/peminjaman/:id (opsional, update umum)
exports.update = async (req, res) => {
  const { id } = req.params;
  const { status, tglKembali } = req.body;

  try {
    const [result] = await db.query(
      "UPDATE peminjaman SET status = COALESCE(?, status), tglKembali = COALESCE(?, tglKembali) WHERE id = ?",
      [status, tglKembali, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data peminjaman tidak ditemukan" });
    }

    res.json({ message: "Peminjaman berhasil diupdate" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal update peminjaman" });
  }
};

// PUT /api/peminjaman/:id/kembalikan
exports.kembalikan = async (req, res) => {
  const { id } = req.params;

  // pakai transaksi biar aman (update peminjaman & update stok harus sama-sama sukses)
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) ambil detail peminjaman
    // Sesuaikan nama kolom: alat_id, qty, status
    const [pRows] = await conn.query(
      "SELECT id, alat_id, qty, status FROM peminjaman WHERE id = ? FOR UPDATE",
      [id]
    );

    if (pRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Peminjaman tidak ditemukan" });
    }

    const peminjaman = pRows[0];

    // opsional: cegah double pengembalian
    if (peminjaman.status === "Dikembalikan") {
      await conn.rollback();
      return res.status(400).json({ message: "Peminjaman sudah dikembalikan" });
    }

    // 2) update peminjaman jadi dikembalikan
    // kalau kamu punya kolom tanggal_pengembalian, pakai itu. Kalau nggak ada, boleh hapus.
    await conn.query(
      "UPDATE peminjaman SET status = ?, tanggal_pengembalian = NOW() WHERE id = ?",
      ["Dikembalikan", id]
    );

    // 3) update stok alat (stok + qty)
    await conn.query(
      "UPDATE alat SET stok = stok + ? WHERE id = ?",
      [peminjaman.qty, peminjaman.alat_id]
    );

    await conn.commit();
    res.json({ message: "Pengembalian berhasil, stok alat bertambah" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Gagal memproses pengembalian" });
  } finally {
    conn.release();
  }
};
