import Complaint from '../models/complaint.model.js';
import Worker from '../models/worker.model.js';
import { getIO } from '../utils/socket.js';

/**
 * Finds the most suitable worker for a complaint based on skill match,
 * availability, and current load. Least busy worker wins with tie-breaker on last assignment.
 */
export const findWorkerForComplaint = async (complaintId) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new Error('Complaint not found');
  }
  if (complaint.assignedWorkerProfile) {
    const existing = await Worker.findById(complaint.assignedWorkerProfile).populate('user', 'name email role');
    return existing;
  }

  const workers = await Worker.find({
    skills: complaint.category,
    'availability.status': 'online',
    $expr: { $lt: ['$currentLoad', '$maxLoad'] },
  })
    .populate('user', 'name email role')
    .lean();

  // If no exact skill match, fall back to any online worker under capacity
  const pool = workers.length
    ? workers
    : await Worker.find({ 'availability.status': 'online', $expr: { $lt: ['$currentLoad', '$maxLoad'] } })
        .populate('user', 'name email role')
        .lean();

  if (!pool.length) {
    return null;
  }

  const sorted = pool
    .filter((worker) => worker.currentLoad < worker.maxLoad)
    .sort((a, b) => {
      if (a.currentLoad !== b.currentLoad) {
        return a.currentLoad - b.currentLoad;
      }
      return new Date(a.lastAssignedAt || 0) - new Date(b.lastAssignedAt || 0);
    });

  return sorted[0];
};

/**
 * Assigns a worker to the complaint and updates both documents atomically.
 */
export const assignWorkerToComplaint = async (complaintId) => {
  const session = await Complaint.startSession();
  session.startTransaction();
  try {
    const worker = await findWorkerForComplaint(complaintId);
    if (!worker) {
      await session.abortTransaction();
      session.endSession();
      return null;
    }

    const [updatedComplaint, updatedWorker] = await Promise.all([
      Complaint.findByIdAndUpdate(
        complaintId,
        {
          assignedWorker: worker.user?._id,
          assignedWorkerProfile: worker._id,
          $push: {
            history: {
              status: 'pending',
              actor: worker.user?._id,
              note: 'Worker auto-assigned',
              changedAt: new Date(),
            },
          },
        },
        { new: true, session },
      ),
      Worker.findByIdAndUpdate(
        worker._id,
        {
          $inc: { currentLoad: 1 },
          lastAssignedAt: new Date(),
          $addToSet: { assignedComplaints: complaintId },
        },
        { new: true, session },
      ),
    ]);

    await session.commitTransaction();
    session.endSession();

    const io = getIO();
    if (io && updatedComplaint) {
      io.to(`worker:${worker._id}`).emit('worker:new-task', {
        complaintId: updatedComplaint._id,
        roomNumber: updatedComplaint.roomNumber,
        category: updatedComplaint.category,
        priority: updatedComplaint.priority,
        description: updatedComplaint.description,
      });

      const populatedComplaint = await updatedComplaint.populate('createdBy', 'name email');
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

    return { complaint: updatedComplaint, worker: updatedWorker };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
