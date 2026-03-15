import Complaint from '../models/complaint.model.js';
import Worker from '../models/worker.model.js';
import User from '../models/user.model.js';
import { getIO } from '../utils/socket.js';
import { assignWorkerToComplaint } from '../services/assignment.service.js';

const incrementPriority = (mergedCount) => {
  if (mergedCount >= 3) return 'urgent';
  if (mergedCount >= 1) return 'high';
  return 'normal';
};

export const createComplaint = async (req, res) => {
  try {
    const { title, description, roomNumber, category, photo: photoInput, photoUrl, voiceTranscript, qrCodeId, priority } = req.body;

    const normalizedRoom = roomNumber?.trim().toUpperCase();
    const photo = photoInput || photoUrl;

    if (!normalizedRoom) {
      return res.status(400).json({ message: 'Room number is required' });
    }

    if (!photo) {
      return res.status(400).json({ message: 'Photo evidence is required' });
    }

    const duplicateForUser = await Complaint.findOne({
      createdBy: req.user._id,
      roomNumber: normalizedRoom,
      category,
      status: { $ne: 'completed' },
    });

    if (duplicateForUser) {
      return res.status(409).json({
        message: 'You have already submitted this issue. Track it using the existing ticket.',
        complaintId: duplicateForUser._id,
      });
    }

    const existing = await Complaint.findOne({
      roomNumber: normalizedRoom,
      category,
      status: { $ne: 'completed' },
    });

    let duplicateOf;
    const mergedReports = [];
    if (existing) {
      duplicateOf = existing._id;
      const reportEntry = { user: req.user._id, reportedAt: new Date() };
      mergedReports.push(reportEntry);
      existing.mergedReports.push(reportEntry);
      existing.priority = incrementPriority(existing.mergedReports.length);
      await existing.save();
    }

    const complaint = await Complaint.create({
      title,
      description,
      roomNumber: normalizedRoom,
      category,
      photoUrl: photo,
      voiceTranscript,
      qrCodeId,
      createdBy: req.user._id,
      duplicateOf,
      mergedReports,
      priority: priority || 'normal',
      history: [
        {
          status: 'pending',
          actor: req.user._id,
          note: 'Complaint created',
        },
      ],
    });

    await assignWorkerToComplaint(complaint._id).catch(() => null);

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('assignedWorker', 'name email mobileNumber department role')
      .populate('createdBy', 'name email department role');

    const io = getIO();
    if (io) {
      const payload = {
        complaintId: populatedComplaint._id,
        roomNumber: populatedComplaint.roomNumber,
        category: populatedComplaint.category,
        priority: populatedComplaint.priority,
        createdAt: populatedComplaint.createdAt,
      };

      io.to('role:admin').emit('complaint:new', payload);
      io.to('role:authority').emit('complaint:new', payload);
    }

    return res.status(201).json({ message: 'Complaint submitted', complaint: populatedComplaint });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to submit complaint', error: error.message });
  }
};

export const getUserComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ createdBy: req.user._id })
      .populate('assignedWorker', 'name email mobileNumber department role')
      .populate({ path: 'assignedWorkerProfile', select: 'skills availability.status currentLoad' })
      .sort({ createdAt: -1 });
    return res.status(200).json({ complaints });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch complaints', error: error.message });
  }
};

export const getComplaintsByRollNumber = async (req, res) => {
  try {
    const rollNumberParam = req.params.rollNumber?.toUpperCase();
    if (!rollNumberParam) {
      return res.status(400).json({ message: 'Roll number is required' });
    }

    if (req.user.role === 'student' && rollNumberParam !== req.user.rollNumber) {
      return res.status(403).json({ message: 'You can only view your own complaints' });
    }

    const user = await User.findOne({ rollNumber: rollNumberParam });
    if (!user) {
      return res.status(404).json({ message: 'No user found with the provided roll number' });
    }

    const complaints = await Complaint.find({ createdBy: user._id })
      .populate('assignedWorker', 'name email mobileNumber department role')
      .populate({ path: 'assignedWorkerProfile', select: 'skills availability.status currentLoad' })
      .sort({ createdAt: -1 });

    return res.status(200).json({ complaints });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch complaints', error: error.message });
  }
};

export const getAllComplaints = async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.category) filters.category = req.query.category;

    const complaints = await Complaint.find(filters)
      .populate('createdBy', 'name department role')
      .populate('assignedWorker', 'name email mobileNumber department role')
      .populate({ path: 'assignedWorkerProfile', select: 'skills availability.status currentLoad' })
      .sort({ priority: -1, createdAt: -1 });

    return res.status(200).json({ complaints });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch complaints', error: error.message });
  }
};

export const getAssignedComplaints = async (req, res) => {
  try {
    let workerUserId = req.query.workerId;

    if (req.user.role === 'worker') {
      workerUserId = req.user._id;
    }

    if (!workerUserId) {
      return res.status(400).json({ message: 'workerId query is required for admin/authority requests' });
    }

    let workerProfile = await Worker.findOne({ user: workerUserId }).select('_id user');

    if (!workerProfile && req.query.workerId) {
      workerProfile = await Worker.findById(req.query.workerId).select('_id user');
      if (workerProfile) {
        workerUserId = workerProfile.user;
      }
    }

    if (!workerProfile) {
      workerProfile = await Worker.findOne({ user: workerUserId }).select('_id user');
    }

    if (!workerProfile) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    const complaints = await Complaint.find({ assignedWorker: workerUserId, status: { $ne: 'completed' } })
      .populate('createdBy', 'name department role email mobileNumber')
      .populate('assignedWorker', 'name email mobileNumber department role')
      .sort({ priority: -1, createdAt: -1 });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    return res.status(200).json({ complaints, worker: { profileId: workerProfile._id, userId: workerProfile.user } });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch assigned complaints', error: error.message });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const complaintId = req.params.id || req.params.complaintId;
    if (!complaintId) {
      return res.status(400).json({ message: 'Complaint id is required' });
    }
    const { status, note } = req.body;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = status;
    complaint.history.push({ status, note, actor: req.user._id });

    if (status === 'completed' && complaint.assignedWorkerProfile) {
      await Worker.findByIdAndUpdate(complaint.assignedWorkerProfile, {
        $inc: { currentLoad: -1 },
        lastAssignedAt: new Date(),
      });
    }

    await complaint.save();

    await complaint.populate('createdBy', 'name email role');
    const io = getIO();
    if (io && complaint.createdBy?._id) {
      io.to(`user:${complaint.createdBy._id}`).emit('complaint:status-updated', {
        complaintId: complaint._id,
        status: complaint.status,
        note,
        updatedAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({ message: 'Status updated', complaint });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
};

export const assignWorker = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { workerId } = req.body;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const worker = await Worker.findById(workerId).populate('user', 'name email role');
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    if (worker.currentLoad >= worker.maxLoad) {
      return res.status(400).json({ message: 'Worker currently overloaded' });
    }

    complaint.assignedWorker = worker.user?._id;
    complaint.assignedWorkerProfile = worker._id;
    complaint.history.push({ status: complaint.status, actor: req.user._id, note: 'Worker assigned' });

    worker.currentLoad += 1;
    worker.lastAssignedAt = new Date();
    worker.assignedComplaints.push(complaint._id);

    await Promise.all([complaint.save(), worker.save()]);

    const io = getIO();
    if (io) {
      io.to(`worker:${worker._id}`).emit('worker:new-task', {
        complaintId: complaint._id,
        roomNumber: complaint.roomNumber,
        category: complaint.category,
        priority: complaint.priority,
        description: complaint.description,
      });

      const populatedComplaint = await complaint.populate('createdBy', 'name email');
      if (populatedComplaint?.createdBy?._id) {
        io.to(`user:${populatedComplaint.createdBy._id}`).emit('complaint:assigned', {
          complaintId: populatedComplaint._id,
          roomNumber: populatedComplaint.roomNumber,
          category: populatedComplaint.category,
          priority: populatedComplaint.priority,
          workerName: worker.user?.name,
          assignedAt: new Date().toISOString(),
        });
      }
    }

    return res.status(200).json({ message: 'Worker assigned', complaint });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to assign worker', error: error.message });
  }
};
