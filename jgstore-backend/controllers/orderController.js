const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Middleware para session (igual que en CartController)
const requireLogin = (req, res, next) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Usuario no logueado' });
    }
    next();
};

// POST /procesar (Principal: Pago completo con factura/tracking)
exports.procesarPago = [requireLogin, async (req, res) => {
    const user_id = req.session.user_id;  // Cambiado a session
    const { shipping_address = 'Dirección por defecto', billing_address = 'Dirección por defecto' } = req.body;

    try {
        // Obtener cart
        const [items] = await pool.execute(
            `SELECT c.*, p.name, p.price, p.stock 
             FROM cart c 
             JOIN products p ON c.product_id = p.id 
             WHERE c.user_id = ?`,
            [user_id]
        );

        if (items.length === 0) {
            return res.json({ error: 'Carrito vacío' });
        }

        // Validar stock y calcular total
        let total = 0;
        const valid_items = [];
        for (const item of items) {
            if (item.stock < item.quantity) {
                return res.json({ error: `Stock insuficiente para ${item.name}` });
            }
            total += item.price * item.quantity;
            valid_items.push({
                product_id: item.product_id,
                quantity: item.quantity,
                price_at_purchase: item.price
            });
        }

        // Crear order
        const fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const [orderResult] = await pool.execute(
            `INSERT INTO orders (user_id, total_amount, status, shipping_address, created_at) 
             VALUES (?, ?, 'pendiente', ?, ?)`,
            [user_id, total, shipping_address, fecha]
        );
        const order_id = orderResult.insertId;

        // Order items
        for (const item of valid_items) {
            await pool.execute(
                `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) 
                 VALUES (?, ?, ?, ?)`,
                [order_id, item.product_id, item.quantity, item.price_at_purchase]
            );
        }

        // Invoice
        const invoice_date = new Date().toISOString().slice(0, 10);
        await pool.execute(
            `INSERT INTO invoices (order_id, invoice_date, billing_address, total) 
             VALUES (?, ?, ?, ?)`,
            [order_id, invoice_date, billing_address, total]
        );

        // Transaction (simulado) – Fix syntax: Chequeo separado para insert
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

        // Crear Tracking
        const tracking_number = `TRK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        await pool.execute(
            `INSERT INTO tracking (order_id, tracking_number, status) VALUES (?, ?, 'Pedido recibido')`,
            [order_id, tracking_number]
        );

        // Actualizar stock
        for (const item of valid_items) {
            await pool.execute(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // Borrar cart
        await pool.execute('DELETE FROM cart WHERE user_id = ?', [user_id]);

        // Generar PDF – Path ajustado: controllers/ -> jgstore-backend/ -> root JGStore/facturas
        const numero_factura = `FAC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${order_id}`;
        const facturasDir = path.join(__dirname, '../../facturas');  // Ajustado (ver nota abajo)
        if (!fs.existsSync(facturasDir)) {
            fs.mkdirSync(facturasDir, { recursive: true });
        }
        const pdf_filename = `factura_${order_id}.pdf`;
        const pdf_path = path.join(facturasDir, pdf_filename);
        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(pdf_path);
        doc.pipe(writeStream);

        doc.fontSize(16).text(`Factura #${numero_factura}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Usuario ID: ${user_id}`);
        doc.text(`Fecha: ${fecha}`);
        doc.text(`Total: $${total.toFixed(2)}`);
        doc.moveDown(0.5);
        doc.text('Items:');
        for (const item of valid_items) {
            const [prodRows] = await pool.execute('SELECT name FROM products WHERE id = ?', [item.product_id]);
            const prod_name = prodRows[0]?.name || 'Producto';
            doc.text(`- ${prod_name} x${item.quantity} ($${item.price_at_purchase.toFixed(2)})`);
        }
        doc.end();

        // Actualizar status
        await pool.execute('UPDATE orders SET status = "procesando" WHERE id = ?', [order_id]);

        res.json({
            success: true,
            mensaje: 'Pago procesado exitosamente',
            order_id,
            tracking_number,
            factura_numero: numero_factura,
            pdf_url: `/facturas/${pdf_filename}`,
            total,
            redirect: `/pago.html?order_id=${order_id}&tracking=${tracking_number}`
        });
    } catch (error) {
        console.error('Error en procesarPago:', error);
        res.status(500).json({ error: 'Error en procesamiento' });
    }
}];

// POST /createOrder (Bonus: Si lo usas; convertido a raw SQL)
exports.createOrder = [requireLogin, async (req, res) => {
    try {
        const user_id = req.session.user_id;  // Session
        const { items, shippingAddress } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Items requeridos' });
        }

        let total = 0;
        for (const item of items) {
            total += item.price * item.quantity;
        }

        const fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const [orderResult] = await pool.execute(
            `INSERT INTO orders (user_id, total_amount, status, shipping_address, created_at) 
             VALUES (?, ?, 'pendiente', ?, ?)`,
            [user_id, total, shippingAddress || 'Dirección por defecto', fecha]
        );
        const order_id = orderResult.insertId;

        // Order items
        for (const item of items) {
            await pool.execute(
                `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) 
                 VALUES (?, ?, ?, ?)`,
                [order_id, item.product_id, item.quantity, item.price]
            );
        }

        // Generar tracking único (raw SQL en lugar de Tracking.create)
        const tracking_number = `JG-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        await pool.execute(
            `INSERT INTO tracking (order_id, tracking_number, status) VALUES (?, ?, 'Pedido recibido')`,
            [order_id, tracking_number]
        );

        res.status(201).json({ 
            success: true,
            message: "Orden creada con éxito", 
            data: { order_id, total, tracking_number }
        });
    } catch (error) {
        console.error('Error en createOrder:', error);
        res.status(500).json({ message: "Error al crear la orden", error: error.message });
    }
}];

// GET /rastreo (Bonus: Detalles por código)
exports.getRastreo = [requireLogin, async (req, res) => {
    const { codigo } = req.query;
    const user_id = req.session.user_id;  // Session

    if (!codigo) {
        return res.status(400).json({ error: 'Código de rastreo requerido' });
    }

    try {
        const [tracking] = await pool.execute(
            `SELECT t.tracking_number, t.status, t.last_updated, o.id as order_id, o.total_amount, o.shipping_address 
             FROM tracking t 
             JOIN orders o ON t.order_id = o.id 
             WHERE t.tracking_number = ? AND o.user_id = ?`,
            [codigo, user_id]
        );

        if (tracking.length === 0) {
            return res.status(404).json({ error: 'Rastreo no encontrado o no autorizado' });
        }

        res.json({ success: true, data: tracking[0] });
    } catch (error) {
        console.error('Error en getRastreo:', error);
        res.status(500).json({ error: 'Error en base de datos' });
    }
}];

