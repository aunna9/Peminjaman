const express = require("express");
const router = express.Router();
const controller = require("../controllers/pengembalianController");
const authJWT = require("../middleware/authMiddleware");

const onlyAdminOrPetugas = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "admin" && role !== "petugas") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

router.get("/", authJWT, onlyAdminOrPetugas, controller.index);
router.put("/:id/konfirmasi", authJWT, onlyAdminOrPetugas, controller.konfirmasi);

module.exports = router;
