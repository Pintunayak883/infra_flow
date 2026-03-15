import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';
import { getAssignedComplaints } from '../controllers/complaint.controller.js';

const router = Router();

router.get('/tasks', authMiddleware, roleMiddleware('worker'), getAssignedComplaints);

export default router;
