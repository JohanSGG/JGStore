// jgstore-backend/routes/orderRoutes.js 
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { protect, isClient } = authMiddleware;  
const pool = require('../config/db');  // Fallback si req.db no disponible

// Protege todas las rutas con JWT (general, no role-specific para orders)
router.use(protect);

// GET /api/order/rastreo?codigo=TRK-... 
router.get('/rastreo', async (req, res) => {
    const { codigo } = req.query;
    const user_id = req.user.id;  // De JWT

    if (!codigo) {
        return res.status(400).json({ error: 'Código de rastreo requerido' });
    }

    try {
        const [tracking] = await req.db.execute(  // Usa req.db (seteado en server.js)
            'SELECT t.*, o.status, o.total_amount FROM tracking t JOIN orders o ON t.order_id = o.id WHERE t.tracking_number = ? AND o.user_id = ?',
            [codigo, user_id]
        );
        if (tracking.length === 0) {
            return res.json({ error: 'No encontrado' });
        }
        res.json({ success: true, data: tracking[0] });
    } catch (error) {
        console.error('Error en rastreo:', error);
        res.status(500).json({ error: 'Error en BD' });
    }
});

// POST /api/order/create
router.post('/create', async (req, res) => {
    const user_id = req.user.id;
    const { items, shipping_address, total } = req.body;  // De frontend sync

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Items requeridos' });
    }

    try {
        const fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const [orderResult] = await req.db.execute(
            'INSERT INTO orders (user_id, total_amount, status, shipping_address, created_at) VALUES (?, ?, "pendiente", ?, ?)',
            [user_id, total, shipping_address, fecha]
        );
        const order_id = orderResult.insertId;

        // Inserta items (ejemplo)
        for (const item of items) {
            await req.db.execute(
                'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)',
                [order_id, item.product_id, item.quantity, item.price]
            );
        }

        // Genera tracking
        const tracking_number = `TRK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        await req.db.execute(
            'INSERT INTO tracking (order_id, tracking_number, status) VALUES (?, ?, "Pedido recibido")',
            [order_id, tracking_number]
        );

        res.json({ success: true, order_id, tracking_number });
    } catch (error) {
        console.error('Error create order:', error);
        res.status(500).json({ error: 'Error en creación' });
    }
});

// GET /api/order/myorders (protegida, lista orders del user)
router.get('/myorders', async (req, res) => {
    const user_id = req.user.id;

    try {
        const [orders] = await req.db.execute(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [user_id]
        );
        res.json({ success: true, orders });
    } catch (error) {
        console.error('Error myorders:', error);
        res.status(500).json({ error: 'Error en myorders' });
    }
});

module.exports = router;  // Exporta correctamente
