// jgstore-backend/controllers/authController.js (VERSIÓN FINAL)
const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { nombre, apellido, email, password, role, storeName } = req.body;

        if (!nombre || !apellido || !email || !password) {
            return res.status(400).json({ message: "Todos los campos principales son obligatorios." });
        }
        
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: "El correo ya está registrado." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            nombre,
            apellido,
            email,
            password: hashedPassword,
            role: role || 'cliente',
            storeName: storeName || null // <-- ARREGLO CLAVE: Asegura que si no hay storeName, se guarde NULL y no 'undefined'.
        };
        
        const user = await User.create(newUser);
        
        const payload = { id: user.id, email: user.email, role: user.role, nombre: user.nombre, storeName: user.storeName };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        res.status(201).json({
            message: "Usuario registrado con éxito", token,
            user: { id: user.id, email: user.email, role: user.role, nombre: user.nombre, storeName: user.storeName }
        });
    } catch (error) {
        console.error("ERROR DETALLADO EN EL REGISTRO:", error); // Añadido para mejor depuración
        res.status(500).json({ message: "Error en el servidor al registrar", error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        if (!user) { return res.status(401).json({ message: "Credenciales inválidas." }); }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(401).json({ message: "Credenciales inválidas." }); }

        const payload = { id: user.id, email: user.email, role: user.role, nombre: user.nombre, storeName: user.storeName };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: "Inicio de sesión exitoso", token,
            user: { id: user.id, email: user.email, role: user.role, nombre: user.nombre, storeName: user.storeName }
        });
    } catch (error) {
        console.error("ERROR DETALLADO EN EL LOGIN:", error); // Añadido para mejor depuración
        res.status(500).json({ message: "Error en el servidor al iniciar sesión", error: error.message });
    }
};