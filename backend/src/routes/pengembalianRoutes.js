const express = require("express");
const router = express.Router();
const controller = require("../controllers/pengembalianController");

router.get("/", controller.getAll);
router.put("/:id/pengembalian", controller.kembalikan);

module.exports = router;
