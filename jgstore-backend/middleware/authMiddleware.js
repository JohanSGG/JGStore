// jgstore-backend/middleware/authMiddleware.js (Corregido: Usa module.exports Directo + Logs Debug)
const jwt = require('jsonwebtoken');

// Función helper para findById (usa req.db)
const findById = async (userId, dbPool) => {
    try {
        const [rows] = await dbPool.execute(
            'SELECT id, nombre, apellido, email, role, storeName FROM users WHERE id = ?',
            [userId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error('Error en findById:', error.message);
        throw error;
    }
};

// Middleware general para proteger rutas (async OK en Express moderno)
module.exports.protect = async (req, res, next) => {  // Cambiado a module.exports.protect
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_clave_secreta_para_jwt_1234567890');
            if (!req.db) {
                return res.status(500).json({ message: 'Error interno: DB no disponible' });
            }
            req.user = await findById(decoded.id, req.db);
            if (!req.user) {
                return res.status(401).json({ message: 'Usuario no encontrado' });
            }
            console.log('DEBUG: protect ejecutado, user:', req.user.id);  // Debug temporal
            next();
        } catch (error) {
            console.error('Error en protect:', error.message);
            res.status(401).json({ message: 'No autorizado, token fallido' });
        }
    } else {
        res.status(401).json({ message: 'No autorizado, no hay token' });
    }
};

// Middleware para admin
module.exports.isAdmin = (req, res, next) => {  
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
};

// Middleware para vendedor
module.exports.isSeller = (req, res, next) => { 
    if (req.user && (req.user.role === 'vendedor' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requiere rol de vendedor.' });
    }
};

// Middleware para cliente
module.exports.isClient = (req, res, next) => {  
    if (req.user && req.user.role === 'cliente') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requiere rol de cliente.' });
    }
};

console.log('DEBUG: authMiddleware cargado, protect definido:', typeof module.exports.protect);  // Debug temporal