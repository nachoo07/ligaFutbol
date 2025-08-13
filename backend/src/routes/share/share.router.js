import { Router } from 'express';
import { getAllShares, createShare, getSharesBySemester, updateShare, deleteShare, getSharesByStudent, createMassiveShares, getAvailableShareNames } from '../../controllers/share/share.controllers.js';
import { admin, protect } from '../../middlewares/login/protect.js';

const router = Router();

router.get('/', protect, admin, getAllShares);
router.post('/create', protect, admin, createShare);
router.post('/create-massive', protect, admin, createMassiveShares);
router.put('/update/:id', protect, admin, updateShare);
router.get('/by-semester', protect, admin, getSharesBySemester);
router.delete('/delete/:id', protect, admin, deleteShare);
router.get('/available-names', protect, admin, getAvailableShareNames); // Nueva ruta
router.get('/:id', protect, admin, getSharesByStudent);


export default router;