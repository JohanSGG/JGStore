const db = require('../config/db');

class Product {
    static async create(newProduct) {
        const { name, description, price, stock, imageUrl, seller_id, category_id } = newProduct;
        const sql = 'INSERT INTO products (name, description, price, stock, imageUrl, seller_id, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const [result] = await db.execute(sql, [name, description, price, stock, imageUrl, seller_id, category_id]);
        return { id: result.insertId, ...newProduct };
    }

    static async findAll() {
        // Unimos la tabla de productos con la de usuarios y categorías para obtener más información
        const sql = `
            SELECT 
                p.id, p.name, p.description, p.price, p.stock, p.imageUrl,
                c.name AS category_name,
                u.storeName AS seller_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN users u ON p.seller_id = u.id
        `;
        const [rows] = await db.query(sql);
        return rows;
    }

    static async findById(id) {
        const sql = 'SELECT * FROM products WHERE id = ?';
        const [rows] = await db.execute(sql, [id]);
        return rows[0];
    }
    
    static async updateById(id, productData) {
        const { name, description, price, stock, imageUrl, category_id } = productData;
        const sql = 'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, imageUrl = ?, category_id = ? WHERE id = ?';
        const [result] = await db.execute(sql, [name, description, price, stock, imageUrl, category_id, id]);
        return result.affectedRows;
    }

    static async remove(id) {
        const sql = 'DELETE FROM products WHERE id = ?';
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }
}
