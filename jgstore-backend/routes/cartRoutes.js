// jgstore-backend/routes/cartRoutes.js 
const express = require('express');
const pool = require('../config/db');  // Directo para queries
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { protect, isClient } = authMiddleware;  
// Protege todas las rutas: JWT + solo clientes
router.use(protect, isClient);

// POST /agregar
router.post('/agregar', async (req, res) => {
    const { product_id, quantity = 1 } = req.body;
    const user_id = req.user.id;  // De JWT via protect

    if (!product_id || quantity <= 0) {
        return res.json({ error: 'Datos inválidos' });
    }

    try {
        // Verificar stock (usa pool directo)
        const [products] = await pool.execute('SELECT stock, name FROM products WHERE id = ?', [product_id]);
        const product = products[0];
        if (!product || product.stock < quantity) {
            return res.json({ error: `Stock insuficiente para: ${product?.name || 'Producto'}` });
        }

        // Insertar o actualizar (usa req.db para consistencia, o pool)
        await req.db.execute(  // Usa req.db (seteado en server.js)
            'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
            [user_id, product_id, quantity, quantity]
        );

        res.json({ success: true, mensaje: 'Producto añadido al carrito' });
    } catch (error) {
        console.error('Error en agregar:', error);
        res.status(500).json({ error: 'Error en BD' });
    }
});

// POST /remover
router.post('/remover', async (req, res) => {
    const { product_id } = req.body;
    const user_id = req.user.id;

    if (!product_id) {
        return res.json({ error: 'Producto inválido' });
    }

    try {
        await req.db.execute('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
        res.json({ success: true, mensaje: 'Producto removido del carrito' });
    } catch (error) {
        console.error('Error en remover:', error);
        res.status(500).json({ error: 'Error en BD' });
    }
});

// GET /obtener
router.get('/obtener', async (req, res) => {
    const user_id = req.user.id;

    try {
        const [items] = await req.db.execute(
            `SELECT c.id, c.product_id, c.quantity, p.name, p.price, p.imageUrl 
             FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?`,
            [user_id]
        );

        let total = 0;
        items.forEach(item => {
            item.subtotal = item.price * item.quantity;
            total += item.subtotal;
        });

        res.json({ success: true, items, total });
    } catch (error) {
        console.error('Error en obtener:', error);
        res.status(500).json({ error: 'Error en BD' });
    }
});

module.exports = router;
