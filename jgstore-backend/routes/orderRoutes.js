// jgstore-backend/routes/orderRoutes.js 
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware inline para verificar token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token requerido', error: 'No hay token' });
    
    try {
        const secret = process.env.JWT_SECRET || 'mi_clave_secreta_para_jwt_1234567890';
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido', error: 'Token fallido' });
    }
};

// Aplica el middleware a todas las rutas
router.use(verifyToken);

// GET /api/order/rastreo?codigo=TRK-...
router.get('/rastreo', async (req, res) => {
    const { codigo } = req.query;
    const user_id = req.user.id;

    console.log('📥 Solicitud rastreo:', { codigo, user_id });

    if (!codigo) {
        return res.status(400).json({ error: 'Código de rastreo requerido' });
    }

    try {
        const [tracking] = await pool.execute(
            'SELECT t.*, o.status, o.total_amount FROM tracking t JOIN orders o ON t.order_id = o.id WHERE t.tracking_number = ? AND o.user_id = ?',
            [codigo, user_id]
        );
        
        if (tracking.length === 0) {
            return res.status(404).json({ error: 'No encontrado' });
        }
        
        res.json({ success: true, data: tracking[0] });
    } catch (error) {
        console.error('❌ Error en rastreo:', error.message);
        res.status(500).json({ error: 'Error en BD: ' + error.message });
    }
});

// POST /api/order/create
router.post('/create', async (req, res) => {
    const user_id = req.user.id;
    const { items, shipping_address, total } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Items requeridos' });
    }

    try {
        const fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const [orderResult] = await pool.execute(
            'INSERT INTO orders (user_id, total_amount, status, shipping_address, created_at) VALUES (?, ?, "pendiente", ?, ?)',
            [user_id, total, shipping_address, fecha]
        );
        const order_id = orderResult.insertId;

        for (const item of items) {
            await pool.execute(
                'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)',
                [order_id, item.product_id, item.quantity, item.price]
            );
        }

        const tracking_number = `TRK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        await pool.execute(
            'INSERT INTO tracking (order_id, tracking_number, status) VALUES (?, ?, "Pedido recibido")',
            [order_id, tracking_number]
        );

        res.json({ success: true, order_id, tracking_number });
    } catch (error) {
        console.error('❌ Error create order:', error.message);
        res.status(500).json({ error: 'Error en creación' });
    }
});

// GET /api/order/myorders
router.get('/myorders', async (req, res) => {
    const user_id = req.user.id;

    try {
        const [orders] = await pool.execute(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [user_id]
        );
        res.json({ success: true, orders });
    } catch (error) {
        console.error('❌ Error myorders:', error.message);
        res.status(500).json({ error: 'Error en myorders' });
    }
});

module.exports = router;