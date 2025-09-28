const db = require('../config/db');

class Order {
    static async create(userId, items, shippingAddress) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            let totalAmount = 0;
            // Verificamos el precio y stock de cada item desde la BD para seguridad
            for (const item of items) {
                const [productRows] = await connection.execute('SELECT price, stock FROM products WHERE id = ? FOR UPDATE', [item.productId]);
                if (productRows.length === 0 || productRows[0].stock < item.quantity) {
                    throw new Error(`Producto con ID ${item.productId} sin stock suficiente.`);
                }
                totalAmount += productRows[0].price * item.quantity;
                item.price_at_purchase = productRows[0].price; // Guardamos el precio actual
            }

            const orderSql = 'INSERT INTO orders (user_id, total_amount, shipping_address) VALUES (?, ?, ?)';
            const [orderResult] = await connection.execute(orderSql, [userId, totalAmount, shippingAddress]);
            const newOrderId = orderResult.insertId;

            const orderItemsSql = 'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ?';
            const orderItemsValues = items.map(item => [newOrderId, item.productId, item.quantity, item.price_at_purchase]);
            await connection.query(orderItemsSql, [orderItemsValues]);

            // Actualizar el stock
            for (const item of items) {
                await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId]);
            }

            await connection.commit();
            return { id: newOrderId, totalAmount, items };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async findByUserId(userId) {
        const sql = `
            SELECT o.*, GROUP_CONCAT(p.name SEPARATOR ', ') as products
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;
        const [rows] = await db.execute(sql, [userId]);
        return rows;
    }
}

module.exports = Order;