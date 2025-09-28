// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

// Middleware para proteger rutas
exports.protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Obtener el token del encabezado
            token = req.headers.authorization.split(' ')[1];

            // 2. Verificar el token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Obtener el usuario del token y adjuntarlo al request
            req.user = await User.findById(decoded.id);
            next(); // Continuar a la siguiente función
        } catch (error) {
            res.status(401).json({ message: 'No autorizado, token fallido' });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'No autorizado, no hay token' });
    }
};

// Middleware para verificar si es admin
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
};

// Middleware para verificar si es vendedor
exports.isSeller = (req, res, next) => {
    if (req.user && (req.user.role === 'vendedor' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requiere rol de vendedor.' });
    }
};