import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';
import {
  createComplaint,
  getUserComplaints,
  getComplaintsByRollNumber,
  getAssignedComplaints,
  getAllComplaints,
  updateComplaintStatus,
  assignWorker,
} from '../controllers/complaint.controller.js';

const router = Router();

// Students can create complaints
router.post('/create', authMiddleware, roleMiddleware('student'), createComplaint);

// Students, workers, admin, authority can view their own complaints
router.get('/user', authMiddleware, getUserComplaints);

// Students, workers, admin, authority can view complaints by roll number
router.get('/user/:rollNumber', authMiddleware, getComplaintsByRollNumber);

// Worker dashboard assignments
router.get('/assigned', authMiddleware, roleMiddleware('worker', 'admin', 'authority'), getAssignedComplaints);

// Only admin and authority can view all complaints
router.get('/all', authMiddleware, roleMiddleware('admin', 'authority'), getAllComplaints);

// Workers, admin, authority can update complaint status
router.put('/update-status/:id', authMiddleware, roleMiddleware('worker', 'admin', 'authority'), updateComplaintStatus);

// Only admin can assign workers to complaints
router.put('/assign-worker/:complaintId', authMiddleware, roleMiddleware('admin'), assignWorker);

export default router;
