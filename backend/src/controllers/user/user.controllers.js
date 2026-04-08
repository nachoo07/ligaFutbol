import User from "../../models/user/user.model.js";
import bcrypt from 'bcryptjs';

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  mail: user.mail,
  role: user.role,
  state: user.state,
  fixed: user.fixed,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json(users.map(sanitizeUser));
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  const { name, mail, password, role } = req.body;

  if (!name || !mail || !password || !role) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  try {
    const existingUser = await User.findOne({ mail: mail.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'Ya existe un usuario con ese correo.' });
    }

    const userCount = await User.countDocuments();
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name.trim(),
      mail: mail.toLowerCase().trim(),
      password: hashedPassword,
      role,
      fixed: userCount === 0 && role === 'admin',
    });

    await newUser.save();

    res.status(201).json(sanitizeUser(newUser));
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  const { id } = req.params;
  const { name, mail, role, state } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (user.fixed && role && role !== 'admin') {
      return res.status(403).json({ message: 'No se puede cambiar el rol de un administrador fijo.' });
    }

    if (mail && mail !== user.mail) {
      const existingUser = await User.findOne({
        mail: mail.toLowerCase().trim(),
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Ya existe un usuario con ese correo.' });
      }
    }

    if (name) user.name = name.trim();
    if (mail) user.mail = mail.toLowerCase().trim();
    if (role) user.role = role;
    if (typeof state === 'boolean') user.state = state;

    await user.save();

    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (user.fixed) {
      return res.status(403).json({ message: 'No se puede eliminar un usuario fijo.' });
    }

    const adminCount = await User.countDocuments({ role: 'admin' });
    if (user.role === 'admin' && adminCount <= 1) {
      return res.status(403).json({ message: 'No se puede eliminar el último administrador.' });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({ message: 'Usuario eliminado correctamente.' });
  } catch (error) {
    console.error(`[ERROR] Error al eliminar usuario ${id}:`, error);
    next(error);
  }
};

export const updateUserState = async (req, res, next) => {
  const { userId } = req.params;
  const { state } = req.body;

  if (typeof state !== 'boolean') {
    return res.status(400).json({ message: 'State must be a boolean.' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (user.fixed && !state) {
      return res.status(403).json({ message: 'No se puede desactivar un usuario fijo.' });
    }

    user.state = state;
    await user.save();

    res.status(200).json({
      message: `Estado actualizado a ${state ? 'activo' : 'inactivo'}.`,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};
