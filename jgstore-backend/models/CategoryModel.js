// models/CategoryModel.js
const db = require('../config/db');

class Category {
    static async create({ name, description }) {
        const sql = 'INSERT INTO categories (name, description) VALUES (?, ?)';
        const [result] = await db.execute(sql, [name, description]);
        return { id: result.insertId, name, description };
    }

    static async findAll() {
        const sql = 'SELECT * FROM categories';
        const [rows] = await db.query(sql);
        return rows;
    }
}

module.exports = Category;