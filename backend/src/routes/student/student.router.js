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
const storage = multer.memoryStorage(); // Almacena en memoria para Cloudinary
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB límite
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'text/csv', // .csv
      'image/jpeg', // .jpg
      'image/png', // .png
      'application/pdf', // .pdf (si permites otros tipos de archivos)
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido'));
    }
    cb(null, true);
  },
});

router.get('/', protect, admin, getAllStudents);
router.get('/:id', protect, admin, getStudentById);
router.post('/create', protect, admin, upload.fields([{ name: 'profileImage', maxCount: 1 }, { name: 'archived', maxCount: 2 }]), createStudent);
router.put('/update/:id', protect, admin, upload.fields([{ name: 'profileImage', maxCount: 1 }, { name: 'archived', maxCount: 2 }]), updateStudent);
router.delete('/delete/:id', protect, admin, deleteStudent);
router.post('/import', protect, admin, upload.single('excelFile'), importStudents);

export default router;