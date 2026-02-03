// src/models/peminjaman.js
const db = require("./db");

const Peminjaman = {
  // GET ALL
  getAll: async () => {
    const sql = "SELECT * FROM peminjaman ORDER BY id_peminjaman DESC";
    const [rows] = await db.query(sql);
    return rows;
  },

  // GET BY ID
  getById: async (id) => {
    const sql = "SELECT * FROM peminjaman WHERE id_peminjaman = ? LIMIT 1";
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  },

  // CREATE
  // data minimal: { id_user, id_alat, tanggal_pinjam, status? }
  create: async (data) => {
    const sql = `
      INSERT INTO peminjaman (id_user, id_alat, tanggal_pinjam, status)
      VALUES (?, ?, ?, ?)
    `;
    const params = [
      data.id_user,
      data.id_alat,
      data.tanggal_pinjam,
      data.status ?? "dipinjam",
    ];
    const [result] = await db.query(sql, params);
    return result.insertId; // ini id_peminjaman yang baru
  },

  // UPDATE (status + tanggal_kembali)
  update: async (id, data) => {
    const sql = `
      UPDATE peminjaman
      SET status = COALESCE(?, status),
          tanggal_kembali = COALESCE(?, tanggal_kembali)
      WHERE id_peminjaman = ?
    `;
    const params = [data.status ?? null, data.tanggal_kembali ?? null, id];
    const [result] = await db.query(sql, params);
    return result.affectedRows;
  },

  // DELETE
  destroy: async (id) => {
    const sql = "DELETE FROM peminjaman WHERE id_peminjaman = ?";
    const [result] = await db.query(sql, [id]);
    return result.affectedRows;
  },
};

module.exports = Peminjaman;
