// controllers/categoryController.js
const Category = require('../models/CategoryModel');

exports.createCategory = async (req, res) => {
    try {
        const category = await Category.create(req.body);
        res.status(201).json({ message: "Categoría creada", data: category });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.status(200).json({ data: categories });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};