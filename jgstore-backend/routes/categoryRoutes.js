// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Cualquiera puede ver las categorías
router.get('/', categoryController.getAllCategories);

// Solo un admin puede crear una nueva categoría
router.post('/', protect, isAdmin, categoryController.createCategory);

module.exports = router;