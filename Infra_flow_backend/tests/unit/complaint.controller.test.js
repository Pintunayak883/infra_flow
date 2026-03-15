import { jest } from '@jest/globals';
import {
  createComplaint,
  updateComplaintStatus,
  assignWorker,
} from '../../controllers/complaint.controller.js';
import * as mockModelStubs from '../mocks/modelStubs.js';
import { createMockRequest, createMockResponse } from '../utils/httpMocks.js';

jest.mock('../../models/complaint.model.js', () => {
  const actual = jest.requireActual('../mocks/modelStubs.js');
  return {
    __esModule: true,
    default: actual.mockComplaintModel,
  };
});

jest.mock('../../models/worker.model.js', () => {
  const actual = jest.requireActual('../mocks/modelStubs.js');
  return {
    __esModule: true,
    default: actual.mockWorkerModel,
  };
});

jest.mock('../../utils/socket.js', () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })) })),
}));

const { mockComplaintModel, mockWorkerModel, resetModelStubs } = mockModelStubs;

describe('Complaint controller', () => {
  beforeEach(() => {
    resetModelStubs();
  });

  it('escalates duplicate complaints and creates a new record', async () => {
    const existingOpenComplaint = {
      _id: 'cmp-2',
      mergedReports: [],
      priority: 'normal',
      save: jest.fn(),
    };

    mockComplaintModel.findOne
      .mockResolvedValueOnce(null) // duplicate for same user
      .mockResolvedValueOnce(existingOpenComplaint); // similar open case
    mockComplaintModel.create.mockResolvedValue({ _id: 'cmp-99' });

    const req = createMockRequest({
      body: {
        title: 'Leaking pipe',
        description: 'Water everywhere',
        roomNumber: 'B-204',
        category: 'plumbing',
        photoUrl: 'data:image/png;base64,abc',
      },
      user: { _id: 'student-1' },
    });
    const res = createMockResponse();

    await createComplaint(req, res);

    expect(existingOpenComplaint.mergedReports).toHaveLength(1);
    expect(existingOpenComplaint.priority).toBe('high');
    expect(mockComplaintModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'student-1', duplicateOf: 'cmp-2' }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('updates complaint status and appends history', async () => {
    const complaintRecord = {
      _id: 'cmp-1',
      status: 'pending',
      history: [],
      assignedWorker: 'wrk-1',
      save: jest.fn(),
      populate: jest.fn().mockResolvedValue({ createdBy: { _id: 'student-1' }, _id: 'cmp-1', status: 'completed' }),
    };
    mockComplaintModel.findById.mockResolvedValue(complaintRecord);
    mockWorkerModel.findByIdAndUpdate.mockResolvedValue(true);

    const req = createMockRequest({
      params: { id: 'cmp-1' },
      body: { status: 'completed', note: 'Fixed' },
      user: { _id: 'worker-7' },
    });
    const res = createMockResponse();

    await updateComplaintStatus(req, res);

    expect(complaintRecord.history).toHaveLength(1);
    expect(complaintRecord.status).toBe('completed');
    expect(mockWorkerModel.findByIdAndUpdate).toHaveBeenCalledWith('wrk-1', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('assigns a worker to a complaint when capacity allows', async () => {
    const complaintRecord = {
      _id: 'cmp-55',
      status: 'pending',
      history: [],
      roomNumber: 'LAB-2',
      category: 'electrical',
      priority: 'high',
      description: 'Panel sparks',
      save: jest.fn().mockResolvedValue(true),
      populate: jest.fn().mockResolvedValue({ _id: 'cmp-55', createdBy: { _id: 'student-8', name: 'Jay' } }),
    };
    mockComplaintModel.findById.mockResolvedValue(complaintRecord);

    const workerRecord = {
      _id: 'worker-3',
      user: { name: 'Asha' },
      currentLoad: 1,
      maxLoad: 3,
      assignedComplaints: [],
      save: jest.fn().mockResolvedValue(true),
    };
    mockWorkerModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(workerRecord),
    });

    const req = createMockRequest({
      params: { complaintId: 'cmp-55' },
      body: { workerId: 'worker-3' },
      user: { _id: 'admin-1', role: 'admin' },
    });
    const res = createMockResponse();

    await assignWorker(req, res);

    expect(complaintRecord.assignedWorker).toBe('worker-3');
    expect(workerRecord.currentLoad).toBe(2);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
