
const express = require('express');
const router = express.Router();

// Middleware para auth (integra con tu JWT de authRoutes; asume token en header)
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token requerido' });
    try {
        // Decodifica JWT (usa tu función de authRoutes, e.g., jwt.verify(token, secret))
        // req.user = decoded;  // Asume que decoded tiene { id, role }
        req.user = { id: 1, role: 'vendedor' };  // Placeholder; reemplaza con real JWT
        if (req.user.role !== 'vendedor') return res.status(403).json({ message: 'Solo vendedores pueden agregar productos' });
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token inválido' });
    }
};

// GET /api/products - Todos los productos (público)
    router.get('/:id', async (req, res) => {
        try {
            const [rows] = await req.db.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
            if (rows.length === 0) return res.status(404).json({ message: 'Producto no encontrado' });
            const product = rows[0];
            product.colors = JSON.stringify(product.colors || '["Negro","Blanco"]');  // Asegura string para parse
            product.configurations = JSON.stringify(product.configurations || '{"Básica":"0","Estándar":"50000","Premium":"100000"}');
            res.json(product);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
// GET /api/products/:id - Producto por ID (público)
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await req.db.execute(
            'SELECT id, name, description, price, stock, imageUrl, colors, configurations, created_at FROM products WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        const product = rows[0];
        product.colors = typeof product.colors === 'string' ? JSON.parse(product.colors) : product.colors;
        product.configurations = typeof product.configurations === 'string' ? JSON.parse(product.configurations) : product.configurations;
        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: 'Error al cargar producto' });
    }
});

// POST /api/products - Agregar nuevo producto (restringido a vendedores)
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name, description, price, stock = 0, imageUrl, category_id, colors, configurations } = req.body;
        if (!name || !price || !imageUrl || !description) {
            return res.status(400).json({ message: 'Campos requeridos: name, price, imageUrl, description' });
        }
        const [result] = await req.db.execute(
            `INSERT INTO products (name, description, price, stock, imageUrl, seller_id, category_id, colors, configurations) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, description, price, stock, imageUrl,
                req.user.id,  // ID del vendedor logueado
                category_id || null,
                JSON.stringify(colors || ['Negro', 'Blanco']),
                JSON.stringify(configurations || ['Básica', 'Premium'])
            ]
        );
        const newProduct = { id: result.insertId, ...req.body, seller_id: req.user.id };
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Error al crear producto' });
    }
});

module.exports = router;
