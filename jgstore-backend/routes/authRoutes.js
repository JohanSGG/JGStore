// jgstore-backend/routes/authRoutes.js (Completo: Limpio, JWT con Role, Usa req.db)
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
     console.log('DEBUG: Login route hit, req.db disponible:', !!req.db);
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email y password requeridos' });
        }

        // Usa req.db (seteado en server.js)
        const [userRows] = await req.db.execute('SELECT id, nombre, apellido, email, password, role, storeName FROM users WHERE email = ?', [email]);
        const user = userRows[0];
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
                apellido: user.apellido || '',
                email: user.email,
                role: user.role,
                storeName: user.storeName || null
            }
        });
    } catch (error) {
        console.error('ERROR en login:', error);
        res.status(500).json({ message: 'Error en servidor: ' + (error.message || 'Inténtalo de nuevo') });
    }
});

// POST /api/auth/register (para usuario y vendedor)
router.post('/register', async (req, res) => {
    console.log('DEBUG: Register route hit, req.db disponible:', !!req.db);
    try {
        const { nombre, apellido, email, password, storeName, role = 'cliente' } = req.body;
        if (!email || !password || !nombre) {
            return res.status(400).json({ message: 'Campos requeridos: nombre, email, password' });
        }

        // Verifica si email existe
        const [existingRows] = await req.db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existingRows.length > 0) {
            return res.status(400).json({ message: 'Email ya registrado' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserta usuario (inline; o usa UserModel.createUser ({..., hashedPassword}, req.db))
        const [insertResult] = await req.db.execute(
            'INSERT INTO users (nombre, apellido, email, password, role, storeName) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, apellido || '', email, hashedPassword, role, storeName || null]
        );

        // Obtén el nuevo usuario
        const [newUserRows] = await req.db.execute('SELECT id, nombre, apellido, email, role, storeName FROM users WHERE email = ?', [email]);
        const newUser  = newUserRows[0];

        if (!newUser ) {
            return res.status(500).json({ message: 'Error al obtener usuario nuevo' });
        }

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
                apellido: newUser .apellido || '',
                email: newUser .email,
                role: newUser .role,
                storeName: newUser .storeName || null
            }
        });
    } catch (error) {
        console.error('Error en register:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'Email ya registrado (conflicto de clave única)' });
        }
        res.status(500).json({ message: 'Error en registro: ' + (error.message || 'Inténtalo de nuevo') });
    }

    router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error en logout:', err);
            return res.status(500).json({ message: 'Error al cerrar sesión' });
        }
        res.json({ message: 'Sesión cerrada exitosamente' });
    });
});

});

module.exports = router;
