require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Johan9@$> ',
    database: process.env.DB_NAME || 'jgstore_db'
};

// Datos hardcodeados de products.js (copia de tu array)
const productsData = [
    { id: 'p1', name: 'Laptop Pro X15', price: 4500000, img: 'images/laptop.png', description: 'Potente laptop con procesador de última generación, 16GB de RAM y 1TB SSD. Ideal para diseño y programación.' },
    { id: 'p2', name: 'Teclado Mecánico K-800', price: 380000, img: 'images/keyboard.png', description: 'Experimenta una respuesta táctil superior con switches Cherry MX y retroiluminación RGB personalizable.' },
    { id: 'p3', name: 'Audífonos Sound-X Pro', price: 620000, img: 'images/headphones.png', description: 'Sonido de alta fidelidad con cancelación de ruido activa. Hasta 30 horas de autonomía para una inmersión total.' },
    { id: 'p4', name: 'Smartphone Galaxy S30', price: 3800000, img: 'images/phone.png', description: 'Cámara triple de 108MP, pantalla Dynamic AMOLED 2X de 6.7 pulgadas y batería para todo el día.' },
    { id: 'p5', name: 'Smartwatch Active 5', price: 950000, img: 'images/smartwatch.png', description: 'Monitoriza tu actividad física, ECG y sueño. Recibe notificaciones y paga desde tu muñeca con estilo.' },
    { id: 'p6', name: 'Tablet Vision 11', price: 1700000, img: 'images/tablet.png', description: 'Pantalla Liquid Retina de 11 pulgadas, ideal para dibujar, tomar notas y ver contenido multimedia en alta calidad.' },
    { id: 'p7', name: 'Power Bank 25,000mAh', price: 210000, img: 'images/power-bank.png', description: 'Carga tus dispositivos múltiples veces con esta batería externa de alta capacidad y carga rápida de 100W.' },
    { id: 'p8', name: 'Cargador GaN 120W', price: 150000, img: 'images/charger.png', description: 'Carga tu laptop, tablet y smartphone simultáneamente con este cargador compacto de nitruro de galio.' },
    { id: 'p9', name: 'Mouse Ergonómico MX', price: 280000, img: 'images/mouse.png', description: 'Diseño ergonómico para máxima comodidad durante horas de trabajo. Conectividad dual y scroll electromagnético.' },
    { id: 'p10', name: 'Monitor UltraWide 34"', price: 2800000, img: 'images/monitor.png', description: 'Maximiza tu productividad con este monitor curvo UltraWide QHD de 34 pulgadas. Ideal para multitarea.' }
    // Agrega más aquí si tienes hasta 50
];

async function seedProducts() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Conectado a MySQL para seed...');

        // Inserta cada producto (mapea campos, usa defaults)
        for (const product of productsData) {
            await connection.execute(
                `INSERT IGNORE INTO products (name, description, price, stock, imageUrl, seller_id, category_id, colors, configurations) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    product.name,
                    product.description,
                    product.price,
                    100,  // Default stock
                    product.img,  // Mapea img → imageUrl
                    1,  // Default seller_id=1 (admin/vendedor)
                    null,  // category_id=NULL
                    JSON.stringify(['Negro', 'Blanco', 'Plateado']),  // Default colors como JSON
                    JSON.stringify(['Básica (8GB RAM, 256GB)', 'Estándar (16GB RAM, 512GB)', 'Premium (32GB RAM, 1TB)'])  // Default configurations como JSON
                ]
            );
            console.log(`Insertado: ${product.name} (ID en BD: auto-generado)`);
        }
        console.log(`¡Seed completado! ${productsData.length} productos insertados en MySQL.`);
    } catch (error) {
        console.error('Error en seed:', error.message);
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            console.log('Error de FK: Crea un usuario con ID=1 primero (ver SQL arriba).');
        } else if (error.code === 'ER_BAD_FIELD_ERROR') {
            console.log('Columna faltante: Ejecuta el ALTER TABLE para colors/configurations.');
        }
    } finally {
        if (connection) await connection.end();
    }
}

seedProducts();
