const db = require("../models/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "ayosekolah"; 

exports.register = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: "username, password, role wajib diisi" });
    }

    // cek username sudah ada atau belum
    const [exist] = await db.query("SELECT id_user FROM users WHERE username = ? LIMIT 1", [username]);
    if (exist.length > 0) {
      return res.status(409).json({ message: "Username sudah digunakan" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";
    const [result] = await db.query(sql, [username, hashedPassword, role]);

    return res.json({
      message: "register berhasil",
      id: result.insertId,
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error", error: String(err) });
  }
};

// ===== LOGIN =====
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "username dan password wajib" });
    }

    const sql = "SELECT * FROM users WHERE username = ? LIMIT 1";
    const [rows] = await db.query(sql, [username]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "User tidak di temukan" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Password salah" });
    }

    const token = jwt.sign(
      { id: user.id_user, role: (user.role || "").toLowerCase() },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login berhasil",
      token,
      role: (user.role || "").toLowerCase(), // ✅ biar frontend gampang
      id_user: user.id_user,
      username: user.username,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error", error: String(err) });
  }
};

// ===== GET ALL USERS =====
exports.index = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id_user, username, role FROM users ORDER BY id_user DESC");
    return res.json(rows);
  } catch (err) {
    console.error("INDEX USER ERROR:", err);
    return res.status(500).json({ message: "Server error", error: String(err) });
  }
};

// ===== GET 1 USER =====
exports.show = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT id_user, username, role FROM users WHERE id_user = ? LIMIT 1",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "user tidak ditemukan" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("SHOW USER ERROR:", err);
    return res.status(500).json({ message: "Server error", error: String(err) });
  }
};

// ===== UPDATE USER =====
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role } = req.body;

    if (!username || !role) {
      return res.status(400).json({ message: "username dan role wajib diisi" });
    }

    const [result] = await db.query(
      "UPDATE users SET username = ?, role = ? WHERE id_user = ?",
      [username, role, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    return res.json({ message: "User berhasil diperbarui" });
  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    return res.status(500).json({ message: "Server error", error: String(err) });
  }
};

// ===== DELETE USER =====
exports.destroy = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM users WHERE id_user = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    return res.json({ message: "User berhasil dihapus" });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    return res.status(500).json({ message: "Server error", error: String(err) });
  }
};
