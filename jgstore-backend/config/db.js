// jgstore-backend/config/db.js 
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'jgstore_db',
    port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
};

console.log(`[db.js] Conectando a MySQL Interno -> Host: ${dbConfig.host} | Puerto: ${dbConfig.port}`);

const pool = mysql.createPool(dbConfig);

pool.getConnection().then(conn => {
    console.log('✅ Conexión MySQL desde config/db.js: EXITOSA');
    conn.release();
}).catch(err => {
    console.error('❌ Error en config/db.js:', err.message);
});

module.exports = pool;