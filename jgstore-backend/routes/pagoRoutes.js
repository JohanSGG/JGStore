// jgstore-backend/routes/pagoRoutes.js
const express = require('express');
const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware inline para verificar token (reemplaza authMiddleware)
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token requerido', error: 'No hay token' });
    
    try {
        const secret = process.env.JWT_SECRET || 'mi_clave_secreta_para_jwt_1234567890';
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido', error: 'Token fallido' });
    }
};

// Verifica que el rol sea cliente
const isClient = (req, res, next) => {
    if (req.user && req.user.role === 'cliente') {
        next();
    } else {
        return res.status(403).json({ message: 'Acceso denegado. Solo clientes.' });
    }
};

// Aplica los middleware a todas las rutas
router.use(verifyToken, isClient);

// POST /procesar
router.post('/procesar', async (req, res) => {
    const user_id = req.user.id;
    const { shipping_address = 'Dirección por defecto', billing_address = 'Dirección por defecto' } = req.body;

    console.log('📥 Procesando pago para user_id:', user_id);

    try {
        // Obtener cart
        const [items] = await pool.execute(
            `SELECT c.*, p.name, p.price, p.stock FROM cart c 
             JOIN products p ON c.product_id = p.id WHERE c.user_id = ?`,
            [user_id]
        );

        if (items.length === 0) {
            return res.status(400).json({ error: 'Carrito vacío' });
        }

        // Calcular total
        let total = 0;
        const valid_items = [];
        for (const item of items) {
            if (item.stock < item.quantity) {
                return res.status(400).json({ error: `Stock insuficiente para: ${item.name}` });
            }
            total += item.price * item.quantity;
            valid_items.push({
                product_id: item.product_id,
                quantity: item.quantity,
                price_at_purchase: item.price
            });
        }

        const fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const invoice_date = new Date().toISOString().slice(0, 10);

        // Crear Order
        const [orderResult] = await pool.execute(
            `INSERT INTO orders (user_id, total_amount, status, shipping_address, created_at) 
             VALUES (?, ?, 'pendiente', ?, ?)`,
            [user_id, total, shipping_address, fecha]
        );
        const order_id = orderResult.insertId;

        // Order Items
        for (const item of valid_items) {
            await pool.execute(
                `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) 
                 VALUES (?, ?, ?, ?)`,
                [order_id, item.product_id, item.quantity, item.price_at_purchase]
            );
        }

        // Invoice
        await pool.execute(
            `INSERT INTO invoices (order_id, invoice_date, billing_address, total) 
             VALUES (?, ?, ?, ?)`,
            [order_id, invoice_date, billing_address, total]
        );

        // Payment Method (simulado)
        let [methodRows] = await pool.execute('SELECT id FROM payment_methods WHERE name = "simulado"');
        let payment_method_id;
        if (methodRows.length === 0) {
            const [insertMethod] = await pool.execute('INSERT INTO payment_methods (name) VALUES ("simulado")');
            payment_method_id = insertMethod.insertId;
        } else {
            payment_method_id = methodRows[0].id;
        }
        await pool.execute(
            `INSERT INTO transactions (order_id, payment_method_id, amount, status) 
             VALUES (?, ?, ?, 'exitoso')`,
            [order_id, payment_method_id, total]
        );

        // Tracking
        const tracking_number = `TRK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        await pool.execute(
            `INSERT INTO tracking (order_id, tracking_number, status) VALUES (?, ?, 'Pedido recibido')`,
            [order_id, tracking_number]
        );

        // Actualizar Stock
        for (const item of valid_items) {
            await pool.execute(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // Borrar Cart
        await pool.execute('DELETE FROM cart WHERE user_id = ?', [user_id]);

        // Generar PDF
        const numero_factura = `FAC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${order_id}`;
        const pdf_filename = `factura_${order_id}.pdf`;
        const facturasDir = path.join(__dirname, '../../facturas');
        if (!fs.existsSync(facturasDir)) {
            fs.mkdirSync(facturasDir, { recursive: true });
        }
        const pdf_path = path.join(facturasDir, pdf_filename);
        
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(fs.createWriteStream(pdf_path));
        doc.fontSize(20).text(`Factura #${numero_factura}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Usuario ID: ${user_id}`);
        doc.text(`Fecha: ${fecha}`);
        doc.text(`Total: $${total.toFixed(2)}`);
        doc.text(`Dirección Envío: ${shipping_address}`);
        doc.moveDown();
        doc.text('Items del Pedido:');
        for (const item of valid_items) {
            doc.text(`- Producto ID: ${item.product_id} x${item.quantity} - $${(item.price_at_purchase * item.quantity).toFixed(2)}`);
        }
        doc.end();

        // Actualizar Status Order
        await pool.execute('UPDATE orders SET status = "procesando" WHERE id = ?', [order_id]);

        console.log(`✅ Pago procesado: Order ${order_id}, Tracking ${tracking_number}`);

        res.json({
            success: true,
            mensaje: 'Pago procesado exitosamente',
            order_id,
            tracking_number,
            factura_numero: numero_factura,
            pdf_url: `/facturas/${pdf_filename}`,
            total
        });
    } catch (error) {
        console.error('❌ Error en pago:', error.message);
        res.status(500).json({ error: 'Error en procesamiento de pago: ' + error.message });
    }
});

module.exports = router;