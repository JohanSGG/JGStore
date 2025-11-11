const pool = require('../config/db');

// Middleware helper (puedes mover a middleware/ si quieres)
const requireLogin = (req, res, next) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Usuario no logueado' });
    }
    next();
};

// POST /agregar
exports.agregar = [requireLogin, async (req, res) => {
    const { product_id, quantity = 1 } = req.body;
    const user_id = req.session.user_id;

    if (!product_id || quantity <= 0) {
        return res.json({ error: 'Datos inválidos' });
    }

    try {
        // Verificar stock
        const [products] = await pool.execute(
            'SELECT stock, name FROM products WHERE id = ?',
            [product_id]
        );
        const product = products[0];
        if (!product || product.stock < quantity) {
            return res.json({ error: `Stock insuficiente para: ${product?.name || 'Producto'}` });
        }

        // Insertar o actualizar
        await pool.execute(
            'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
            [user_id, product_id, quantity, quantity]
        );

        res.json({ success: true, mensaje: 'Producto añadido al carrito' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en BD' });
    }
}];

// POST /remover
exports.remover = [requireLogin, async (req, res) => {
    const { product_id } = req.body;
    const user_id = req.session.user_id;

    if (!product_id) {
        return res.json({ error: 'Producto inválido' });
    }

    try {
        await pool.execute(
            'DELETE FROM cart WHERE user_id = ? AND product_id = ?',
            [user_id, product_id]
        );
        res.json({ success: true, mensaje: 'Producto removido del carrito' });
    } catch (error) {
        res.status(500).json({ error: 'Error en BD' });
    }
}];

// GET /obtener
exports.obtener = [requireLogin, async (req, res) => {
    const user_id = req.session.user_id;

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
        res.status(500).json({ error: 'Error en BD' });
    }
}];
