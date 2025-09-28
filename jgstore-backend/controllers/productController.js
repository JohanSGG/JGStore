// controllers/productController.js
const Product = require('../models/ProductModel');

exports.createProduct = async (req, res) => {
    try {
        // Asignamos el ID del vendedor que está logueado (gracias al middleware 'protect')
        const newProductData = { ...req.body, seller_id: req.user.id };
        const product = await Product.create(newProductData);
        res.status(201).json({ message: "Producto creado", data: product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Producto no encontrado" });

        // VERIFICACIÓN DE PERMISOS
        if (product.seller_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "No tienes permiso para editar este producto" });
        }
        
        await Product.updateById(req.params.id, req.body);
        res.status(200).json({ message: "Producto actualizado" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Producto no encontrado" });
        
        // VERIFICACIÓN DE PERMISOS
        if (product.seller_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "No tienes permiso para eliminar este producto" });
        }

        await Product.remove(req.params.id);
        res.status(200).json({ message: "Producto eliminado" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.getAllProducts = async (req, res) => { /* ... */ };
exports.getProductById = async (req, res) => { /* ... */ };