const db = require("../models/db");

// GET /api/alat?id_kategori=...
exports.index = async (req, res) => {
  try {
    const { id_kategori } = req.query;

    let sql = `
      SELECT a.*, k.nama_kategori
      FROM alat a
      LEFT JOIN kategori k ON k.id_kategori = a.id_kategori
    `;
    const params = [];

    if (id_kategori) {
      sql += " WHERE a.id_kategori = ?";
      params.push(id_kategori);
    }

    sql += " ORDER BY a.id_alat DESC";

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("alat index error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.show = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM alat WHERE id_alat = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("alat show error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.store = async (req, res) => {
  try {
    const { nama_alat, id_kategori, stok, kondisi } = req.body;

    if (!nama_alat || !id_kategori || stok === undefined) {
      return res.status(400).json({ message: "Field belum lengkap" });
    }

    const stokNum = Number(stok);
    if (!Number.isInteger(stokNum) || stokNum < 0) {
      return res.status(400).json({ message: "Stok tidak valid" });
    }

    const kondisiVal = kondisi || "Baik";

    const [result] = await db.query(
      `INSERT INTO alat (nama_alat, id_kategori, stok, kondisi)
       VALUES (?, ?, ?, ?)`,
      [nama_alat, id_kategori, stokNum, kondisiVal]
    );

    res.status(201).json({
      message: "Alat berhasil ditambahkan",
      id_alat: result.insertId,
    });
  } catch (err) {
    console.error("alat store error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const { nama_alat, id_kategori, stok, kondisi } = req.body;

    // minimal 1 field harus ada
    if (
      nama_alat === undefined &&
      id_kategori === undefined &&
      stok === undefined &&
      kondisi === undefined
    ) {
      return res.status(400).json({ message: "Tidak ada data untuk diupdate" });
    }

    const [oldRows] = await db.query(
      "SELECT * FROM alat WHERE id_alat = ?",
      [id]
    );
    if (oldRows.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const old = oldRows[0];

    const newNama = nama_alat ?? old.nama_alat;
    const newKat = id_kategori ?? old.id_kategori;
    const newKondisi = kondisi ?? old.kondisi;

    let newStok = old.stok;
    if (stok !== undefined) {
      const stokNum = Number(stok);
      if (!Number.isInteger(stokNum) || stokNum < 0) {
        return res.status(400).json({ message: "Stok tidak valid" });
      }
      newStok = stokNum;
    }

    await db.query(
      `UPDATE alat
       SET nama_alat = ?, id_kategori = ?, stok = ?, kondisi = ?
       WHERE id_alat = ?`,
      [newNama, newKat, newStok, newKondisi, id]
    );

    res.json({ message: "Alat berhasil diupdate" });
  } catch (err) {
    console.error("alat update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.destroy = async (req, res) => {
  try {
    const id = req.params.id;

    const [rows] = await db.query(
      "SELECT id_alat FROM alat WHERE id_alat = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await db.query("DELETE FROM alat WHERE id_alat = ?", [id]);
    res.json({ message: "Alat berhasil dihapus" });
  } catch (err) {
    console.error("alat destroy error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
