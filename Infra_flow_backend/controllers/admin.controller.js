import Complaint from '../models/complaint.model.js';
import Worker from '../models/worker.model.js';

export const getDashboardData = async (req, res) => {
  try {
    const [statusCounts, categoryCounts, workerLoad] = await Promise.all([
      Complaint.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
      ]),
      Worker.find()
        .populate('user', 'name email department')
        .select('currentLoad maxLoad availability.status')
        .lean(),
    ]);

    const totalsByStatus = statusCounts.reduce(
      (acc, item) => ({ ...acc, [item._id]: item.count }),
      {},
    );

    const complaintsByCategory = categoryCounts.reduce(
      (acc, item) => ({ ...acc, [item._id]: item.count }),
      {},
    );

    const totalComplaints = Object.values(totalsByStatus).reduce((sum, value) => sum + value, 0);

    return res.status(200).json({
      totals: {
        total: totalComplaints,
        pending: totalsByStatus.pending || 0,
        completed: totalsByStatus.completed || 0,
        inProgress: totalsByStatus['in-progress'] || 0,
      },
      complaintsByCategory,
      workerWorkload: workerLoad.map((worker) => ({
        workerId: worker._id,
        name: worker.user?.name,
        email: worker.user?.email,
        department: worker.user?.department,
        availability: worker.availability?.status,
        currentLoad: worker.currentLoad,
        maxLoad: worker.maxLoad,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch dashboard data', error: error.message });
  }
};
