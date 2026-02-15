 // jgstore-backend/config/db.js 
   const mysql = require('mysql2/promise');
   require('dotenv').config();
   const pool = mysql.createPool({
       host: process.env.DB_HOST || 'localhost',
       user: process.env.DB_USER || 'root',
       password: process.env.DB_PASSWORD || '',
       database: process.env.DB_NAME || 'jgstore_db',
       waitForConnections: true,
       connectionLimit: 10,
       queueLimit: 0,
       charset: 'utf8mb4'  // Para emojis/accentos
   });
   // Test conexión al importar 
   pool.getConnection().then(conn => {
       console.log('Conexión MySQL desde config/db.js: OK');
       conn.release();
   }).catch(err => console.error('Error en config/db.js:', err));
   module.exports = pool;
   