const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
// Aquí es donde ocurría tu error. Ahora sí encontrará el archivo.
const { protect, isSeller } = require('../middleware/authMiddleware');

// Rutas Públicas (cualquiera puede ver los productos)
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Rutas Protegidas (solo vendedores/admins pueden crear, y solo el dueño puede editar/borrar)
router.post('/', protect, isSeller, productController.createProduct);
router.put('/:id', protect, productController.updateProduct);
router.delete('/:id', protect, productController.deleteProduct);

module.exports = router;
