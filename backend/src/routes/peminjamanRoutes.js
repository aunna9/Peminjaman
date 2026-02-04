const express = require("express");
const router = express.Router();

const controller = require("../controllers/peminjamanController");
const authJWT = require("../middleware/authMiddleware");

// ===== ROLE GUARD =====
const onlyAdminOrPetugas = (req, res, next) => {
  const role = String(req.user?.role || "").trim().toLowerCase();
  if (!role) return res.status(401).json({ message: "Unauthorized (no role)" });
  if (role !== "admin" && role !== "petugas") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

const onlyPeminjam = (req, res, next) => {
  console.log("USER DARI TOKEN:", req.user); // Tambahkan ini untuk debug
  const role = String(req.user?.role || "").trim().toLowerCase();
  
  if (!role) {
     console.log("Gagal karena role kosong");
     return res.status(401).json({ message: "Unauthorized" });
  }
  // ... rest of code
};

// ===== ROUTES =====

// admin / petugas
router.get("/", authJWT, onlyAdminOrPetugas, controller.index);
router.get("/:id", authJWT, onlyAdminOrPetugas, controller.show);
router.put("/:id", authJWT, onlyAdminOrPetugas, controller.update);
router.delete("/:id", authJWT, onlyAdminOrPetugas, controller.remove);
router.post("/", authJWT, onlyPeminjam, controller.create);

module.exports = router;
