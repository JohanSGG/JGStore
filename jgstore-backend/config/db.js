// jgstore-backend/config/db.js 
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'jgstore_db',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
};

console.log(`[db.js] Intentando conectar a MySQL en -> Host: ${dbConfig.host} | Puerto: ${dbConfig.port} | BD: ${dbConfig.database}`);

const pool = mysql.createPool(dbConfig);

pool.getConnection().then(conn => {
    console.log('✅ Conexión MySQL desde config/db.js: EXITOSA');
    conn.release();
}).catch(err => {
    console.error('❌ Error fatal en config/db.js:', err.message);
});

module.exports = pool;