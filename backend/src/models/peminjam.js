// models/peminjam.js
const db = require("../config/db"); // <-- sesuaikan path db kamu (pool mysql2/promise)

const PeminjamModel = {
  // 1) Ajukan peminjaman (status awal: menunggu)
  async createPengajuan({ user_id, alat_id, jumlah, tgl_pinjam, tgl_kembali_rencana, keperluan }) {
    // cek alat & stok
    const [alatRows] = await db.query(
      "SELECT id, stok FROM alat WHERE id = ?",
      [alat_id]
    );
    if (!alatRows.length) {
      return { ok: false, code: 404, message: "Alat tidak ditemukan" };
    }

    if (Number(alatRows[0].stok) < Number(jumlah)) {
      return { ok: false, code: 400, message: "Stok tidak cukup" };
    }

    // insert pengajuan
    const [result] = await db.query(
      `INSERT INTO peminjaman
        (user_id, alat_id, jumlah, tgl_pinjam, tgl_kembali_rencana, keperluan, status)
       VALUES (?, ?, ?, ?, ?, ?, 'menunggu')`,
      [user_id, alat_id, jumlah, tgl_pinjam, tgl_kembali_rencana, keperluan]
    );

    return { ok: true, id: result.insertId, status: "menunggu" };
  },

  // 2) Ambil semua peminjaman milik user (buat tab Pinjaman Saya)
  async getMine(user_id) {
    const [rows] = await db.query(
      `SELECT p.id, p.alat_id, a.nama AS nama_alat,
              p.jumlah, p.tgl_pinjam, p.tgl_kembali_rencana,
              p.tgl_kembali, p.status, p.created_at
       FROM peminjaman p
       JOIN alat a ON a.id = p.alat_id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [user_id]
    );
    return rows;
  },

  // 3) Kembalikan peminjaman (ubah status + tambah stok)
  async kembalikan({ user_id, peminjaman_id }) {
    // transaksi biar aman
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // lock baris peminjaman milik user
      const [pRows] = await conn.query(
        `SELECT id, alat_id, jumlah, status
         FROM peminjaman
         WHERE id = ? AND user_id = ?
         FOR UPDATE`,
        [peminjaman_id, user_id]
      );

      if (!pRows.length) {
        await conn.rollback();
        return { ok: false, code: 404, message: "Data peminjaman tidak ditemukan" };
      }

      const p = pRows[0];
      const status = (p.status || "").toLowerCase();

      // aturan: hanya boleh jika sudah dipinjam/disetujui (sesuaikan jika perlu)
      if (status !== "dipinjam" && status !== "disetujui") {
        await conn.rollback();
        return { ok: false, code: 400, message: "Tidak bisa dikembalikan pada status ini" };
      }

      // update peminjaman
      await conn.query(
        `UPDATE peminjaman
         SET status='dikembalikan', tgl_kembali=NOW()
         WHERE id = ?`,
        [peminjaman_id]
      );

      // tambah stok lagi (asumsi stok dikurangi saat petugas setujui/dipinjam)
      await conn.query(
        `UPDATE alat
         SET stok = stok + ?
         WHERE id = ?`,
        [Number(p.jumlah), p.alat_id]
      );

      await conn.commit();
      return { ok: true, message: "Pengembalian berhasil" };
    } catch (err) {
      await conn.rollback();
      return { ok: false, code: 500, message: "Server error", error: err.message };
    } finally {
      conn.release();
    }
  },
};

module.exports = PeminjamModel;
