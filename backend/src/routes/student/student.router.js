// src/routes/student.routes.js
import express from 'express';
import {
  getAllStudents,
  createStudent,
  deleteStudent,
  updateStudent,
  getStudentById,
  importStudents,
} from '../../controllers/student/student.controllers.js';
import { admin, protect } from '../../middlewares/login/protect.js';
import multer from 'multer';

const router = express.Router();

// Configuración de multer
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido'));
    }

    cb(null, true);
  },
});

// Lectura disponible para usuarios autenticados
router.get('/', protect, getAllStudents);
router.get('/:id', protect, getStudentById);

// Escritura solo para admin
router.post(
  '/create',
  protect,
  admin,
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'archived', maxCount: 2 },
  ]),
  createStudent
);

router.put(
  '/update/:id',
  protect,
  admin,
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'archived', maxCount: 2 },
  ]),
  updateStudent
);

router.delete('/delete/:id', protect, admin, deleteStudent);
router.post('/import', protect, admin, upload.single('excelFile'), importStudents);

export default router;
