// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');

// POST /api/auth/login (LÍNEA 49: Pasa req.db al modelo)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email y password requeridos' });
        }

        // LÍNEA 49: Llama al modelo PASANDO req.db (pool con password)
        const user = await UserModel.findByEmail(email, req.db);
        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'mi_clave_secreta_para_jwt_1234567890',
            { expiresIn: '1h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                role: user.role,
                storeName: user.storeName || null
            }
        });
    } catch (error) {
        console.error('ERROR DETALLADO EN EL LOGIN:', error);  // Tu stack trace
        res.status(500).json({ message: 'Error en servidor: ' + error.message });
    }
};

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { nombre, apellido, email, password, storeName, role = 'cliente' } = req.body;
        if (!email || !password || !nombre) {
            return res.status(400).json({ message: 'Campos requeridos: nombre, email, password' });
        }

        // Verifica si existe (opcional, modelo lo maneja)
        const existingUser  = await UserModel.findByEmail(email, req.db);
        if (existingUser ) {
            return res.status(400).json({ message: 'Email ya registrado' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crea usuario PASANDO req.db
        const newUser  = await UserModel.createUser (
            { nombre, apellido, email, hashedPassword, role, storeName },
            req.db
        );

        const token = jwt.sign(
            { id: newUser .id, role: newUser .role },
            process.env.JWT_SECRET || 'mi_clave_secreta_para_jwt_1234567890',
            { expiresIn: '1h' }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser .id,
                nombre: newUser .nombre,
                email: newUser .email,
                role: newUser .role,
                storeName: newUser .storeName || null
            }
        });
    } catch (error) {
        console.error('Error en register:', error);
        res.status(500).json({ message: 'Error en registro: ' + error.message });
    }
};
