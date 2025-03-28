import { Router } from 'express';
import { getAllShares, createShare, updateShare, deleteShare, getSharesByStudent, createMassiveShares } from '../../controllers/share/share.controllers.js';
import { admin, protect } from '../../middlewares/login/protect.js';

const router = Router();

router.get('/', protect, admin, getAllShares);
router.post('/create', protect, admin, createShare);
router.post('/create-massive', protect, admin, createMassiveShares); // Nueva ruta para creación masiva
router.put('/update/:id', protect, admin, updateShare);
router.delete('/delete/:id', protect, admin, deleteShare);
router.get('/:id', protect, admin, getSharesByStudent);

export default router;