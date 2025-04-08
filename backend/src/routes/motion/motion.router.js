import { Router } from 'express';
import { 
  createMotion, 
  getMotions, 
  updateMotion, 
  deleteMotion, 
  getMotionsByDate, 
  getMotionsByDateRange,
  getMotionsByLocation,
  getMotionsByLocationAndDateRange 
} from '../../controllers/motion/motion.controllers.js';
import { protect, admin } from '../../middlewares/login/protect.js';

const router = Router();

router.post('/create', protect, admin, createMotion);
router.get('/', protect, admin, getMotions);
router.put('/update/:id', protect, admin, updateMotion);
router.delete('/delete/:id', protect, admin, deleteMotion);
router.get('/date/:date',protect, admin, getMotionsByDate);
router.get('/date-range',protect, admin, getMotionsByDateRange);
router.get('/location/:location',protect, admin, getMotionsByLocation); // Nueva ruta para filtrar por sede
router.get('/location-date-range',protect, admin, getMotionsByLocationAndDateRange); // Nueva ruta para sede y rango de fechas

export default router;