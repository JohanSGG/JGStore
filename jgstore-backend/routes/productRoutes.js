
// jgstore-backend/routes/productRoutes.js
const express = require('express');
const router = express.Router();

// Importa products.js
let productsData;
try {
    productsData = require('../../js/products');
    console.log('✅ products.js cargado correctamente');
    console.log('📦 Tipo:', typeof productsData);
    console.log('📦 Longitud:', Array.isArray(productsData) ? productsData.length : 'No es array');
} catch (error) {
    console.error('❌ Error cargando products.js:', error.message);
    productsData = [];
}

// GET /api/products - Listar todos los productos
router.get('/', async (req, res) => {
    try {
        console.log('📥 Solicitud GET /api/products');
        console.log('📦 productsData:', productsData);
        
        // Verifica que sea un array
        if (!Array.isArray(productsData)) {
            console.warn('⚠️ productsData no es un array, intentando convertir...');
            productsData = productsData.default || productsData.products || [];
        }
        
        console.log('✅ Enviando respuesta con', productsData.length, 'productos');
        res.status(200).json(productsData);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/products/:id - Producto por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = productsData.find(p => p.id === id || p.id === parseInt(id));
        if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Middleware auth (placeholder)
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token requerido' });
    req.user = { id: 1, role: 'vendedor' };
    next();
};

// POST /api/products - Agregar producto
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name, description, price, img } = req.body;
        if (!name || !price || !img || !description) {
            return res.status(400).json({ message: 'Campos requeridos: name, price, img, description' });
        }
        const newProduct = { id: 'p' + (productsData.length + 1), name, description, price, img };
        productsData.push(newProduct);
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear producto' });
    }
});

module.exports = router;