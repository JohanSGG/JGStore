const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware'); // Solo usuarios logueados pueden interactuar con órdenes

// POST /api/orders -> Crear una nueva orden (protegida)
router.post('/', protect, orderController.createOrder);

// GET /api/orders/myorders -> Obtener las órdenes del usuario logueado (protegida)
router.get('/myorders', protect, orderController.getMyOrders);

module.exports = router;
