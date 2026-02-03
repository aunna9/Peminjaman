const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware"); //
const peminjaman = require("../controllers/peminjamController");

// guard role sederhana (kalau kamu belum punya)
function onlyPeminjam(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "peminjam") return res.status(403).json({ message: "Forbidden" });
  next();
}

router.post("/", auth, onlyPeminjam, peminjaman.ajukan);
router.get("/me", auth, onlyPeminjam, peminjaman.getMine);
router.put("/:id/kembalikan", auth, onlyPeminjam, peminjaman.kembalikan);

module.exports = router;
