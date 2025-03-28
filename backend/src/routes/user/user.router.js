import express from 'express';
import {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser, 
    updateUserState
} from '../../controllers/user/user.controllers.js'; // Importa los controladores
import {admin, protect} from '../../middlewares/login/protect.js'; // Importa el middleware de autenticación
const router = express.Router();

// Obtener todos los usuarios
router.get('/',  protect, admin, getAllUsers);

// Crear un nuevo usuario
router.post('/create', protect, admin, createUser);

// Actualizar un usuario por ID
router.put('/update/:id',  protect, admin, updateUser);

// Eliminar un usuario por ID (hard delete)
router.delete('/delete/:id', protect, admin, deleteUser);

// Actualizar el estado de un usuario por ID
router.patch('/users/:userId/state',  protect, admin, updateUserState);

export default router;