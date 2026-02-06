const db = require("../routes/userRoutes");

const Peminjaman = {
  // Ambil semua data peminjaman
  async getAll() {
    const [rows] = await db.query("SELECT * FROM peminjaman ORDER BY id DESC");
    return rows;
  },

  // Update status umum (opsional)
  async updateStatus(id, status) {
    const [result] = await db.query(
      "UPDATE peminjaman SET status = ? WHERE id = ?",
      [status, id]
    );
    return result;
  },

  /**
   * Konfirmasi pengembalian:
   * - ambil data peminjaman (alat_id, qty, status)
   * - update peminjaman status jadi "Dikembalikan" + tanggal_pengembalian (opsional)
   * - tambah stok alat (stok + qty)
   * Semua di dalam TRANSAKSI.
   */
  async kembalikan(id) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Kunci row peminjaman biar aman dari race condition
      const [pRows] = await conn.query(
        "SELECT id, alat_id, qty, status FROM peminjaman WHERE id = ? FOR UPDATE",
        [id]
      );

      if (pRows.length === 0) {
        const err = new Error("Peminjaman tidak ditemukan");
        err.code = "NOT_FOUND";
        throw err;
      }

      const p = pRows[0];

      if (p.status === "Dikembalikan") {
        const err = new Error("Peminjaman sudah dikembalikan");
        err.code = "ALREADY_RETURNED";
        throw err;
      }

      // Update peminjaman
      // Kalau kamu belum punya kolom tanggal_pengembalian, ganti query jadi status saja.
      await conn.query(
        "UPDATE peminjaman SET status = ?, tanggal_pengembalian = NOW() WHERE id = ?",
        ["Dikembalikan", id]
      );

      // Update stok alat
      await conn.query(
        "UPDATE alat SET stok = stok + ? WHERE id = ?",
        [p.qty, p.alat_id]
      );

      await conn.commit();
      return { message: "Pengembalian berhasil" };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};

module.exports = Peminjaman;
