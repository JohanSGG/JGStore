const Order = require('../models/OrderModel');

exports.createOrder = async (req, res) => {
    try {
        const userId = req.user.id; // Obtenemos el ID del usuario logueado gracias al middleware 'protect'
        const { items, shippingAddress } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "El carrito no puede estar vacío." });
        }

        const order = await Order.create(userId, items, shippingAddress);
        res.status(201).json({ message: "Orden creada con éxito", data: order });
    } catch (error) {
        res.status(500).json({ message: "Error al crear la orden", error: error.message });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.findByUserId(req.user.id);
        res.status(200).json({ data: orders });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener las órdenes", error: error.message });
    }
};
