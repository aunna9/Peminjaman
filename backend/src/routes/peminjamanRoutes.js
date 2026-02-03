const express = require('express');
const router = express.Router();
const controller = require('../controllers/peminjamanController');
const authJWT = require("../middleware/authMiddleware")

router.get('/', authJWT, controller.index);
router.get('/:id', authJWT, controller.show);
router.post('/', authJWT, controller.create);
router.put('/:id', authJWT, controller.updateStatus);
router.delete('/:id', authJWT, controller.destroy);

console.log("✅ peminjamanRoutes KE-LOAD");
router.stack.forEach((layer) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
    console.log("🧭 PEMINJAMAN ROUTE:", methods, layer.route.path);
  }
});

module.exports = router;