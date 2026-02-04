const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");
// const authJWT = require("../middleware/authMiddleware"); // kalau nanti dipakai

router.post("/users", controller.register);
router.post("/login", controller.login);
router.get("/users", controller.index);
router.get("/users/:id", controller.show);
router.put("/users/:id", controller.updateUser);
router.delete("/users/:id", controller.destroy);

module.exports = router;
