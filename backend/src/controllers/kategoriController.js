const db = require("../models/db");

// GET /api/kategori
exports.index = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM kategori ORDER BY id_kategori DESC");
    res.json(rows);
  } catch (err) {
    console.error("kategori index error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/kategori/:id
exports.show = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM kategori WHERE id_kategori = ?",
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("kategori show error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/kategori
exports.store = async (req, res) => {
  try {
    const { nama_kategori } = req.body;

    if (!nama_kategori) {
      return res.status(400).json({ message: "nama_kategori wajib diisi" });
    }

    const [result] = await db.query(
      "INSERT INTO kategori (nama_kategori) VALUES (?)",
      [nama_kategori]
    );

    res.status(201).json({
      message: "Kategori berhasil ditambahkan",
      id_kategori: result.insertId,
    });
  } catch (err) {
    console.error("kategori store error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/kategori/:id
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const { nama_kategori } = req.body;

    if (!nama_kategori) {
      return res.status(400).json({ message: "nama_kategori wajib diisi" });
    }

    const [rows] = await db.query(
      "SELECT id_kategori FROM kategori WHERE id_kategori = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }

    await db.query(
      "UPDATE kategori SET nama_kategori = ? WHERE id_kategori = ?",
      [nama_kategori, id]
    );

    res.json({ message: "Kategori berhasil diperbarui" });
  } catch (err) {
    console.error("kategori update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/kategori/:id
exports.destroy = async (req, res) => {
  try {
    const id = req.params.id;

    const [rows] = await db.query(
      "SELECT id_kategori FROM kategori WHERE id_kategori = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }

    await db.query("DELETE FROM kategori WHERE id_kategori = ?", [id]);

    res.json({ message: "Kategori berhasil dihapus" });
  } catch (err) {
    console.error("kategori destroy error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
