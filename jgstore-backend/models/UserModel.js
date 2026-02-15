// models/UserModel.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Función para buscar usuario por email (usada en login)
const findByEmail = async (email, dbPool) => {
    try {
        const [rows] = await dbPool.execute(
            'SELECT id, nombre, apellido, email, password, role, storeName FROM users WHERE email = ?',
            [email]
        );
        console.log('User  Model.findByEmail ejecutado con pool compartido:', { email });
        return rows[0] || null;
    } catch (error) {
        console.error('Error en UserModel.findByEmail:', error.message);
        throw error;
    }
};

// Nueva: Buscar por ID (para authMiddleware.protect)
const findById = async (userId, dbPool) => {
    try {
        const [rows] = await dbPool.execute(
            'SELECT id, nombre, apellido, email, role, storeName FROM users WHERE id = ?',
            [userId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error('Error en UserModel.findById:', error.message);
        throw error;
    }
};

// Función para crear usuario (usada en register)
const createUser  = async (userData, dbPool) => {
    try {
        const { nombre, apellido, email, hashedPassword, role, storeName } = userData;
        
        const [result] = await dbPool.execute(
            'INSERT INTO users (nombre, apellido, email, password, role, storeName) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, apellido || '', email, hashedPassword, role || 'cliente', storeName || null]
        );
        
        const newUserId = result.insertId;
        console.log('User  Model.createUser  exitoso:', { newUserId, email });
        
        return await findByEmail(email, dbPool);
    } catch (error) {
        console.error('Error en UserModel.createUser :', error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('Email ya registrado');
        }
        throw error;
    }
};

module.exports = { findByEmail, createUser , findById };
