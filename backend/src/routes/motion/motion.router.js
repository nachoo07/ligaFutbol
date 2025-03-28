import { Router } from 'express';
import { createMotion, getMotions, updateMotion, deleteMotion, getMotionsByDate, getMotionsByDateRange } from '../../controllers/motion/motion.controllers.js';
import { protect, admin } from '../../middlewares/login/protect.js';
const router = Router();

router.post('/create', protect, admin ,createMotion);
router.get('/', protect, admin, getMotions);
router.put('/update/:id', protect, admin, updateMotion);
router.delete('/delete/:id', protect, admin, deleteMotion);
router.get('/date/:date', getMotionsByDate);
router.get('/date-range', getMotionsByDateRange); // Nueva ruta para obtener movimientos por rango de fechas


export default router;