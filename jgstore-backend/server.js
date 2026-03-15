// jgstore-backend/server.js 
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');  
const bcrypt = require('bcryptjs');   
const session = require('express-session');  
const fs = require('fs');  
const path = require('path');
const pool = require('./config/db');  

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de BD unificada
const dbConfig = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '', 
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'jgstore_db',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || 30739), // Forzamos el puerto de Railway
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Inicializa pool de conexiones MySQL a prueba de fallos
let dbPool;
async function initDbPool() {
    try {
        if (!pool || typeof pool.execute !== 'function') {
            dbPool = await mysql.createPool(dbConfig);
            global.dbPool = dbPool;  
        } else {
            dbPool = pool;  
        }
        console.log('Pool MySQL creado/inicializado exitosamente.');

        const connection = await dbPool.getConnection();
        const [dbRows] = await connection.execute('SELECT DATABASE() as db_name');
        console.log('Conexión a MySQL probada: OK');
        console.log('BD actual:', dbRows[0].db_name);
        
        // Blindamos esta consulta para que NO mate el servidor si la tabla no existe
        try {
            const [userRows] = await connection.execute('SELECT COUNT(*) as user_count FROM users');
            console.log('Usuarios en BD:', userRows[0].user_count);
        } catch (tableError) {
            console.warn('⚠️ Advertencia: La tabla "users" no existe aún en la base de datos.');
        }

        connection.release();
    } catch (error) {
        console.error('❌ Error creando pool MySQL:', error.message);
        // ELIMINADO process.exit(1) para evitar el 502 Bad Gateway
    }
}

// Middleware
app.use(cors({ 
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'https://jgstore-production.up.railway.app'], 
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
    req.db = dbPool || pool;  
    next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'tu_clave_secreta_super_segura_2024',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,  
        maxAge: 1000 * 60 * 60 * 24  
    }
}));

app.use((req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_clave_secreta_para_jwt_1234567890');
            req.user = decoded;  
        } catch (error) {
            console.warn('Token inválido:', error.message);
        }
    }
    next();
});

// Servir archivos estáticos 
app.use(express.static(path.join(__dirname, '../')));

const facturasDir = path.join(__dirname, '../', 'facturas');  
if (!fs.existsSync(facturasDir)) {
    fs.mkdirSync(facturasDir, { recursive: true });
    console.log('Carpeta /facturas creada en root.');
}
app.use('/facturas', express.static(facturasDir));

// Rutas
try {
    const productRoutes = require('./routes/productRoutes');  
    app.use('/api/products', productRoutes);
} catch (e) { console.warn('Ruta de productos falló al cargar.'); }

try {
    const authRoutes = require('./routes/authRoutes');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes cargadas exitosamente.');
} catch (error) {
    console.error('❌ Error en authRoutes.js');
}

app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT 1 as test');  
        res.json({ message: 'DB conexión OK', test: rows[0].test });
    } catch (error) {
        res.status(500).json({ error: 'DB error: ' + error.message });
    }
});

try {
    const cartRoutes = require('./routes/cartRoutes');  
    app.use('/api/cart', cartRoutes);
    console.log('✅ Cart routes cargadas');
} catch (error) { console.error('❌ Error en cartRoutes'); }

try {
    const pagoRoutes = require('./routes/pagoRoutes');  
    app.use('/api/pago', pagoRoutes);
    console.log('✅ Pago routes cargadas');
} catch (error) { console.error('❌ Error en pagoRoutes'); }

try {
    const orderRoutes = require('./routes/orderRoutes');  
    app.use('/api/order', orderRoutes);
    console.log('✅ Order routes cargadas');
} catch (error) { console.error('❌ Error en orderRoutes'); }

// Rutas HTML fallback
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../', 'index.html')));
app.get('/carrito.html', (req, res) => res.sendFile(path.join(__dirname, '../', 'carrito.html')));
app.get('/pago.html', (req, res) => res.sendFile(path.join(__dirname, '../', 'pago.html')));
app.get('/rastreo.html', (req, res) => res.sendFile(path.join(__dirname, '../', 'rastreo.html')));
app.get('/pago_exito.html', (req, res) => {
    const filePath = path.join(__dirname, '../', 'pago_exito.html');
    if (fs.existsSync(filePath)) res.sendFile(filePath);
    else res.redirect('/pago.html');  
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// PRUEBAS DE ENTORNO LIMPIAS
console.log('🔍 Variables de entorno iniciales:');
console.log('DB_HOST:', process.env.DB_HOST || process.env.MYSQLHOST);
console.log('DB_USER:', (process.env.DB_USER || process.env.MYSQLUSER) ? 'OK' : 'FALTA');
console.log('DB_NAME:', process.env.DB_NAME || process.env.MYSQLDATABASE);

// Inicializa pool y empieza server 
async function startServer() {
    await initDbPool();
    // AÑADIDO '0.0.0.0' PARA QUE RAILWAY LO DETECTE CORRECTAMENTE
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor Express corriendo en el puerto ${PORT}`);
        console.log('Paths ajustados: Frontend servido desde root JGStore/.');
    });
}

async function startServer() {
    // 1. ¡CAMBIO CLAVE! Encendemos Express ANTES de la base de datos.
    // Así Railway detecta que la app está viva instantáneamente y no la mata (adiós 502).
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor Express corriendo en el puerto ${PORT}`);
        console.log('Paths ajustados: Frontend servido desde root JGStore/.');
    });

    // 2. Intentamos conectar la BD de forma asíncrona sin bloquear el arranque del servidor web
    try {
        await initDbPool();
    } catch (e) {
        console.error("Fallo al inicializar la BD después del arranque:", e);
    }
}

startServer().catch(error => {
    console.error('Error iniciando server:', error);
});