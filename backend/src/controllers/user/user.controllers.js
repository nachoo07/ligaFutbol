import User from "../../models/user/user.model.js";
import bcrypt from 'bcryptjs';

export const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find(); // Obtiene todos los usuarios
        res.status(200).json(users);
    } catch (error) {
        next(error); // Pasar el error al middleware global
    }
};

export const createUser = async (req, res, next) => {
    const { name, mail, password, role } = req.body;
    // Verificar que todos los campos requeridos estén presentes
    if (!name || !mail || !password || !role) {
        return res.status(400).json({ message: 'Todos los campos son requeridos.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            mail,
            password: hashedPassword,
            role,
        });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        next(error); // Pasar el error al middleware global
    }
};

export const updateUser = async (req, res, next) => {
    const { id } = req.params;
    const { name, mail, role, state } = req.body;
    try {
        // Busca al usuario por ID
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        // Actualiza los campos recibidos
        if (name) user.name = name;
        if (mail) user.mail = mail;
        if (role) user.role = role;
        if (typeof state === 'boolean') user.state = state;

        await user.save();
        res.status(200).json(user);
    } catch (error) {
        next(error); // Pasar el error al middleware global
    }
};

export const deleteUser = async (req, res, next) => {
    const { id } = req.params;
    try {
        // Elimina al usuario por ID
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        next(error); // Pasar el error al middleware global
    }
};

// Actualizar el estado de un usuario por ID
export const updateUserState = async (req, res) => {
    const { userId } = req.params;
    const { state } = req.body;

    if (typeof state !== 'boolean') {
        return res.status(400).json({ message: 'State must be a boolean.' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        user.state = state;
        await user.save();
        res.status(200).json({
            message: `User state updated to ${state ? 'active' : 'inactive'}.`,
            user: { id: user._id, name: user.name, state: user.state },
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user state.', error });
    }
};