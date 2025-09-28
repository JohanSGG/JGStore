// jgstore-backend/models/UserModel.js (VERSIÓN CON DEPURACIÓN)
const db = require('../config/db');

class User {
    static async create(newUser) {
        // --- PRUEBA DE FUEGO ---
        // Si ves estos mensajes en la terminal, significa que estás ejecutando el código nuevo.
        console.log("--- EJECUTANDO UserModel.create (VERSIÓN DEFINITIVA) ---");
        console.log("Datos recibidos para crear en la base de datos:", newUser);
        // --- FIN DE LA PRUEBA DE FUEGO ---

        const { nombre, apellido, email, password, role, storeName } = newUser;
        const sql = 'INSERT INTO users (nombre, apellido, email, password, role, storeName) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.execute(sql, [nombre, apellido, email, password, role, storeName]);
        
        return { id: result.insertId, ...newUser };
    }

    static async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.execute(sql, [email]);
        return rows[0];
    }
}

module.exports = User;