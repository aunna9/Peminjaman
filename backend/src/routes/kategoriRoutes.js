const express = require('express');
const router = express.Router();
const kategoriController = require('../controllers/kategoriController');

router.get('/', kategoriController.index);
router.get('/:id', kategoriController.show);
router.post('/', kategoriController.store);
router.put('/:id', kategoriController.update);
router.delete('/:id', kategoriController.destroy);

module.exports = router;