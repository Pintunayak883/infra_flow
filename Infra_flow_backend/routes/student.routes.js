import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';
import { getUserComplaints } from '../controllers/complaint.controller.js';

const router = Router();

router.get('/complaints', authMiddleware, roleMiddleware('student', 'worker', 'admin', 'authority'), getUserComplaints);

export default router;
