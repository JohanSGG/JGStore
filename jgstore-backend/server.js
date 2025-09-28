require('dotenv').config();
const express = require('express');
const cors = require('cors');

// --- CONFIGURACIÓN DE CORS DEFINITIVA ---
// Esto le dice a nuestro backend: "Confía y acepta todas las peticiones
// que vengan de la dirección de tu Live Server".
const corsOptions = {
    origin: 'http://127.0.0.1:5500',
    optionsSuccessStatus: 200 
};

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors(corsOptions)); // <-- APLICAMOS LA CONFIGURACIÓN
app.use(express.json());

// --- RUTAS ---
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');

// (Aquí irían otras rutas: userRoutes, productRoutes, etc.)

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
// (Aquí irían los otros app.use para las demás rutas)


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT} y aceptando peticiones del frontend en el puerto 5500.`);
});