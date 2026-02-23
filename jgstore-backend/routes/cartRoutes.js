// jgstore-backend/routes/cartRoutes.js
const express = require('express');
const pool = require('../config/db');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware para verificar token JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token requerido' });
    
    try {
        const secret = process.env.JWT_SECRET || 'mi_clave_secreta_para_jwt_1234567890';
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
    }
};

// POST /agregar - Agregar producto al carrito
router.post('/agregar', verifyToken, async (req, res) => {
    const { product_id, quantity = 1 } = req.body;
    const user_id = req.user.id;

    if (!product_id || quantity <= 0) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    try {
        // Verificar stock
        const [products] = await pool.execute('SELECT stock, name FROM products WHERE id = ?', [product_id]);
        const product = products[0];
        if (!product || product.stock < quantity) {
            return res.status(400).json({ error: `Stock insuficiente para: ${product?.name || 'Producto'}` });
        }

        // Insertar o actualizar
        await pool.execute(
            'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
            [user_id, product_id, quantity, quantity]
        );

        res.json({ success: true, mensaje: 'Producto añadido al carrito' });
    } catch (error) {
        console.error('Error en agregar:', error);
        res.status(500).json({ error: 'Error en BD' });
    }
});

// POST /remover - Remover producto del carrito
router.post('/remover', verifyToken, async (req, res) => {
    const { product_id } = req.body;
    const user_id = req.user.id;

    if (!product_id) {
        return res.status(400).json({ error: 'Producto inválido' });
    }

    try {
        await pool.execute('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
        res.json({ success: true, mensaje: 'Producto removido del carrito' });
    } catch (error) {
        console.error('Error en remover:', error);
        res.status(500).json({ error: 'Error en BD' });
    }
});

// GET /obtener - Obtener carrito completo
router.get('/obtener', verifyToken, async (req, res) => {
    const user_id = req.user.id;

    try {
        const [items] = await pool.execute(
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