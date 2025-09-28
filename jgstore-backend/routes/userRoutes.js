// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');


// Rutas CRUD para usuarios
router.post('/', userController.createUser);        // Crear: POST /api/users
router.get('/', userController.getAllUsers);        // Leer todos: GET /api/users
router.get('/:id', userController.getUserById);     // Leer uno: GET /api/users/1
router.put('/:id', userController.updateUser);      // Actualizar: PUT /api/users/1
router.delete('/:id', userController.deleteUser);   // Eliminar: DELETE /api/users/1

module.exports = router;