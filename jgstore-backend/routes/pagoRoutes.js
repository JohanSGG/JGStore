// jgstore-backend/routes/pagoRoutes.js (Completo: JWT + Roles, Tu Lógica Inline Adaptada)
const express = require('express');
const pool = require('../config/db');  // Directo (opcional; usamos req.db principalmente)
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { protect, isClient } = authMiddleware;  

// Protege + role cliente
router.use(protect, isClient);

// POST /procesar (Tu lógica completa, con req.user.id y req.db)
router.post('/procesar', async (req, res) => {
    const user_id = req.user.id;  // De JWT via protect
    const { shipping_address = 'Dirección por defecto', billing_address = 'Dirección por defecto' } = req.body;

    try {
        // Obtener cart (usa req.db)
        const [items] = await req.db.execute(
            `SELECT c.*, p.name, p.price, p.stock FROM cart c 
             JOIN products p ON c.product_id = p.id WHERE c.user_id = ?`,
            [user_id]
        );

        if (items.length === 0) {
            return res.json({ error: 'Carrito vacío' });
        }

        // Validar stock y total
        let total = 0;
        const valid_items = [];
        for (const item of items) {
            if (item.stock < item.quantity) {
                return res.json({ error: `Stock insuficiente para: ${item.name}` });
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

        // 1. Crear Order (usa req.db)
        const [orderResult] = await req.db.execute(
            `INSERT INTO orders (user_id, total_amount, status, shipping_address, created_at) 
             VALUES (?, ?, 'pendiente', ?, ?)`,
            [user_id, total, shipping_address, fecha]
        );
        const order_id = orderResult.insertId;

        // 2. Order Items
        for (const item of valid_items) {
            await req.db.execute(
                `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) 
                 VALUES (?, ?, ?, ?)`,
                [order_id, item.product_id, item.quantity, item.price_at_purchase]
            );
        }

        // 3. Invoice
        await req.db.execute(
            `INSERT INTO invoices (order_id, invoice_date, billing_address, total) 
             VALUES (?, ?, ?, ?)`,
            [order_id, invoice_date, billing_address, total]
        );

        // 4. Payment Method y Transaction (simulado)
        let [methodRows] = await req.db.execute('SELECT id FROM payment_methods WHERE name = "simulado"');
        let payment_method_id;
        if (methodRows.length === 0) {
            const [insertMethod] = await req.db.execute('INSERT INTO payment_methods (name) VALUES ("simulado")');
            payment_method_id = insertMethod.insertId;
        } else {
            payment_method_id = methodRows[0].id;
        }
        await req.db.execute(
            `INSERT INTO transactions (order_id, payment_method_id, amount, status) 
             VALUES (?, ?, ?, 'exitoso')`,
            [order_id, payment_method_id, total]
        );

        // 5. Tracking
        const tracking_number = `TRK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        await req.db.execute(
            `INSERT INTO tracking (order_id, tracking_number, status) VALUES (?, ?, 'Pedido recibido')`,
            [order_id, tracking_number]
        );

        // 6. Actualizar Stock
        for (const item of valid_items) {
            await req.db.execute(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // 7. Borrar Cart
        await req.db.execute('DELETE FROM cart WHERE user_id = ?', [user_id]);

        // 8. Generar PDF – Path ajustado: routes/ -> jgstore-backend/ -> root JGStore/facturas
        const numero_factura = `FAC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${order_id}`;
        const pdf_filename = `factura_${order_id}.pdf`;
        const facturasDir = path.join(__dirname, '../../facturas');  // Ajustado para root JGStore/
        if (!fs.existsSync(facturasDir)) {
            fs.mkdirSync(facturasDir, { recursive: true });
            console.log('Carpeta /facturas creada en root.');
        }
        const pdf_path = path.join(facturasDir, pdf_filename);
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(fs.createWriteStream(pdf_path));

        doc.fontSize(20).text(`Factura #${numero_factura}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Usuario ID: ${user_id}`);
        doc.text(`Nombre: ${req.user.nombre} ${req.user.apellido || ''}`);  // De req.user (JWT)
        doc.text(`Email: ${req.user.email}`);
        doc.text(`Rol: ${req.user.role}`);
        doc.text(`Fecha: ${fecha}`);
        doc.text(`Total: $${total.toFixed(2)}`);
        doc.text(`Dirección Facturación: ${billing_address}`);
        doc.text(`Dirección Envío: ${shipping_address}`);
        doc.moveDown();
        doc.text('Items del Pedido:');
        for (const item of valid_items) {
            const [prodRows] = await req.db.execute('SELECT name FROM products WHERE id = ?', [item.product_id]);
            const prod_name = prodRows[0]?.name || 'Producto desconocido';
            doc.text(`- ${prod_name} x${item.quantity} - $${(item.price_at_purchase * item.quantity).toFixed(2)}`);
        }
        doc.end();

        // 9. Actualizar Status Order
        await req.db.execute('UPDATE orders SET status = "procesando" WHERE id = ?', [order_id]);

        console.log(`Pago procesado para user_id ${user_id}: Order ${order_id}, Tracking ${tracking_number}`);

        res.json({
            success: true,
            mensaje: 'Pago procesado exitosamente',
            order_id,
            tracking_number,
            factura_numero: numero_factura,
            pdf_url: `/facturas/${pdf_filename}`,  // Servido por server.js
            total,
            user: {
                id: req.user.id,
                nombre: req.user.nombre,
                email: req.user.email,
                role: req.user.role
            },
            redirect: `/pago_exito.html?order_id=${order_id}&tracking=${tracking_number}&factura=${numero_factura}`
        });
    } catch (error) {
        console.error('Error en pago:', error);
        res.status(500).json({ error: 'Error en procesamiento de pago: ' + (error.message || 'Inténtalo de nuevo') });
    }
});

module.exports = router;  // Exporta correctamente
