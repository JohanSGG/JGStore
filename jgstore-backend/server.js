// jgstore-backend/server.js (Tu Código + req.db Middleware + Logs Detallados – Funcionalidades Intactas)
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');  // Para auth
const bcrypt = require('bcryptjs');   // Para hash passwords
const session = require('express-session');  // Mantenido (opcional con JWT)
const fs = require('fs');  // Para facturas dir
const path = require('path');
const pool = require('./config/db');  // Directo a config/ (ya OK)

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de BD desde .env (para initDbPool si needed) – Unificado a DB_PASSWORD
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',  // DB_PASSWORD para coincidir con config/db.js
    database: process.env.DB_NAME || 'jgstore_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Inicializa pool de conexiones MySQL (si no usas el importado de config/db) – Tu código intacto
let dbPool;
async function initDbPool() {
    try {
        // Si pool de config/db no está listo, crea uno local
        if (!pool || typeof pool.execute !== 'function') {
            dbPool = await mysql.createPool(dbConfig);
            global.dbPool = dbPool;  // Hazlo global para controllers si needed
        } else {
            dbPool = pool;  // Usa el importado
        }
        console.log('Pool MySQL creado/inicializado exitosamente.');

        // Prueba conexión robusta
        const connection = await dbPool.getConnection();
        const [dbRows] = await connection.execute('SELECT DATABASE() as db_name');
        const [userRows] = await connection.execute('SELECT COUNT(*) as user_count FROM users');
        console.log('Conexión a MySQL probada: OK');
        console.log('BD actual:', dbRows[0].db_name);
        console.log('Usuarios en BD:', userRows[0].user_count);
        connection.release();
    } catch (error) {
        console.error('Error creando pool MySQL:', error.message);
        console.error('Stack trace:', error.stack);
        console.error('Verifica .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME), que MySQL esté corriendo, y que la BD "jgstore_db" exista.');
        process.exit(1);  // Sale si falla conexión
    }
}

// Middleware (limpio, sin duplicados) – Tu código + req.db agregado
app.use(cors({ 
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500'],  // Permite ambos origins comunes
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// NUEVO: Middleware para setear req.db = pool (para authRoutes y routes – resuelve req.db)
app.use((req, res, next) => {
    req.db = dbPool || pool;  // Usa pool global/importado
    next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'tu_clave_secreta_super_segura_2024',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,  // true en producción con HTTPS
        maxAge: 1000 * 60 * 60 * 24  // 1 día
    }
}));

// Middleware para JWT (setea req.user para auth en controllers) – Tu código intacto
app.use((req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_clave_secreta_para_jwt_1234567890');
            req.user = decoded;  // { id, role } para auth (usa req.user.id en controllers)
        } catch (error) {
            console.warn('Token inválido:', error.message);
        }
    }
    next();
});

// Servir archivos estáticos desde ROOT JGStore/ (sube un nivel desde jgstore-backend/) – Tu código intacto
app.use(express.static(path.join(__dirname, '../')));  // '../' para root (index.html, css/, js/)

// Servir PDFs generados desde /facturas (crea dir en root si no existe) – Tu código intacto
const facturasDir = path.join(__dirname, '../', 'facturas');  // En root JGStore/
if (!fs.existsSync(facturasDir)) {
    fs.mkdirSync(facturasDir, { recursive: true });
    console.log('Carpeta /facturas creada en root.');
}
app.use('/facturas', express.static(facturasDir));


const productRoutes = require('./routes/productRoutes');  // Asumido que existe
app.use('/api/products', productRoutes);

// Auth routes (con try-catch para manejar si no existe)
let authRoutes;
try {
    authRoutes = require('./routes/authRoutes');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes cargadas exitosamente.');
} catch (error) {
    console.error('❌ ERROR REAL en ./routes/authRoutes.js:');
    console.error('Mensaje:', error.message);
    console.error('Stack completo:', error.stack);
    authRoutes = express.Router();
    authRoutes.post('/login', (req, res) => res.status(501).json({ message: 'Auth no implementado. Crea authRoutes.js' }));
    authRoutes.post('/register', (req, res) => res.status(501).json({ message: 'Auth no implementado. Crea authRoutes.js' }));
    app.use('/api/auth', authRoutes);
}

// Ruta de prueba DB (usa pool importado) – Tu código intacto
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT 1 as test');  // Usa pool importado
        res.json({ message: 'DB conexión OK', test: rows[0].test });
    } catch (error) {
        console.error('Error en /api/test-db:', error.message);
        res.status(500).json({ error: 'DB error: ' + error.message });
    }
});

// Rutas nuevas/integradas para carrito, pago y rastreo – AJUSTADAS A TUS NOMBRES + logs detallados
try {
    const cartRoutes = require('./routes/cartRoutes');  // Tu nombre: cartRoutes.js
    app.use('/api/cart', cartRoutes);
    console.log('✅ Cart routes cargadas con nombre cartRoutes.js');
} catch (error) {
    console.error('❌ ERROR REAL en ./routes/cartRoutes.js:');
    console.error('Mensaje:', error.message);
    console.error('Stack completo:', error.stack);
    console.error('Crea el archivo con CartController o verifica middleware/authMiddleware.');
}

try {
    const pagoRoutes = require('./routes/pagoRoutes');  // Tu nombre: pagoRoutes.js
    app.use('/api/pago', pagoRoutes);
    console.log('✅ Pago routes cargadas con nombre pagoRoutes.js');
} catch (error) {
    console.error('❌ ERROR REAL en ./routes/pagoRoutes.js:');
    console.error('Mensaje:', error.message);
    console.error('Stack completo:', error.stack);
    console.error('Crea el archivo con orderController o verifica middleware/authMiddleware.');
}

try {
    const orderRoutes = require('./routes/orderRoutes');  // Asumido; para rastreo
    app.use('/api/order', orderRoutes);
    console.log('✅ Order routes cargadas (incluyendo rastreo).');
} catch (error) {
    console.error('❌ ERROR REAL en ./routes/orderRoutes.js:');
    console.error('Mensaje:', error.message);
    console.error('Stack completo:', error.stack);
    console.log('Crea orderRoutes.js para /api/order/rastreo o usa try-catch en controllers.');
}


// Rutas específicas para páginas HTML (fallback; paths a root JGStore/) – Tu código intacto
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../', 'index.html'));  // '../'
});
app.get('/carrito.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../', 'carrito.html'));
});
app.get('/pago.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../', 'pago.html'));
});
app.get('/rastreo.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../', 'rastreo.html'));
});
app.get('/pago_exito.html', (req, res) => {
    const filePath = path.join(__dirname, '../', 'pago_exito.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.redirect('/pago.html');  // Fallback si no existe
    }
});

// Error handler global (al final, para capturar errores en rutas) – Tu código intacto
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Manejo de rutas no encontradas (404) – Tu código intacto
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Inicializa pool y empieza server – Tu código intacto
async function startServer() {
    await initDbPool();
    app.listen(PORT, () => {
        console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
        console.log('Paths ajustados: Server en jgstore-backend/, frontend servido desde root JGStore/.');
        console.log('Frontend servido desde root (e.g., http://localhost:3000/index.html, /carrito.html)');
        console.log('APIs disponibles:');
        console.log('  - GET /api/products (productos)');
        console.log('  - POST /api/auth/login (autenticación)');
        console.log('  - GET /api/test-db (prueba DB)');
        console.log('  - POST /api/cart/agregar (añadir a carrito – via cartRoutes.js)');
        console.log('  - POST /api/cart/remover (quitar de carrito)');
        console.log('  - GET /api/cart/obtener (cargar carrito)');
        console.log('  - POST /api/pago/procesar (procesar pago con factura y tracking – via pagoRoutes.js)');
        console.log('  - GET /api/order/rastreo?codigo=TRK-... (detalles de rastreo – via orderRoutes.js)');
        console.log('  - PDFs: /facturas/factura_*.pdf');
    });
}

startServer().catch(error => {
    console.error('Error iniciando server:', error);
    process.exit(1);
});
