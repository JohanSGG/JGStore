
const db = require('../config/db');

class User {
    // Método para crear un nuevo usuario
    static async create(newUser) {
        // ANTES: no se usaban todos los campos que llegaban.
        // AHORA: desestructuramos todos los campos necesarios del objeto newUser.
        const { nombre, apellido, email, password, role, storeName } = newUser;

        // ANTES: la consulta SQL estaba incompleta.
        // AHORA: la consulta incluye las columnas 'nombre' y 'apellido'.
        const sql = 'INSERT INTO users (nombre, apellido, email, password, role, storeName) VALUES (?, ?, ?, ?, ?, ?)';

        // ANTES: faltaban valores en el array que se pasa a la base de datos.
        // AHORA: se pasan todos los valores en el orden correcto.
        const [result] = await db.execute(sql, [nombre, apellido, email, password, role, storeName]);

        return { id: result.insertId, ...newUser };
    }

    // Método para encontrar un usuario por su email (sin cambios, pero se incluye por completitud)
    static async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.execute(sql, [email]);
        return rows[0];
    }

    // Método para encontrar un usuario por su ID (sin cambios)
    static async findById(id) {
        const sql = 'SELECT id, email, role, storeName, created_at FROM users WHERE id = ?';
        const [rows] = await db.execute(sql, [id]);
        return rows[0];
    }


}

// Obtener todos los usuarios (READ)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json({ data: users });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los usuarios", error: error.message });
    }
};


// Actualizar un usuario (UPDATE)
exports.updateUser = async (req, res) => {
    try {
        const affectedRows = await User.updateById(req.params.id, req.body);
        if (affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        res.status(200).json({ message: "Usuario actualizado con éxito" });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar el usuario", error: error.message });
    }
};

// Eliminar un usuario (DELETE)
exports.deleteUser = async (req, res) => {
    try {
        const affectedRows = await User.remove(req.params.id);
        if (affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        res.status(200).json({ message: "Usuario eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar el usuario", error: error.message });
    }
};

module.exports = User;

