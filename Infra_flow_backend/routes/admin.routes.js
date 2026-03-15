import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';
import { getDashboardData } from '../controllers/admin.controller.js';
import { getAllComplaints } from '../controllers/complaint.controller.js';

const router = Router();

// Admin and authority can access dashboard data
router.get('/dashboard-data', authMiddleware, roleMiddleware('admin', 'authority'), getDashboardData);
router.get('/complaints', authMiddleware, roleMiddleware('admin', 'authority'), getAllComplaints);

export default router;
