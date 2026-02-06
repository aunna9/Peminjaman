const express = require("express");
const router = express.Router();
const controller = require("../controllers/pengembalianController");
const authJWT = require("../middleware/authMiddleware");

router.get("/", authJWT, controller.index);
router.put("/:id/konfirmasi", authJWT, controller.konfirmasi);

module.exports = router;
