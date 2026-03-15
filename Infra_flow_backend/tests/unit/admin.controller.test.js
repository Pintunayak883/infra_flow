import { jest } from '@jest/globals';
import { getDashboardData } from '../../controllers/admin.controller.js';
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

const { mockComplaintModel, mockWorkerModel, resetModelStubs } = mockModelStubs;

describe('Admin analytics controller', () => {
  beforeEach(() => {
    resetModelStubs();
  });

  it('aggregates totals and worker workload data', async () => {
    mockComplaintModel.aggregate
      .mockResolvedValueOnce([
        { _id: 'pending', count: 3 },
        { _id: 'completed', count: 2 },
      ])
      .mockResolvedValueOnce([
        { _id: 'electrical', count: 4 },
        { _id: 'plumbing', count: 1 },
      ]);

    const workerQueryChain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'worker-1',
          user: { name: 'Ira', email: 'ira@campus.edu', department: 'Electrical' },
          availability: { status: 'online' },
          currentLoad: 2,
          maxLoad: 5,
        },
      ]),
    };
    mockWorkerModel.find.mockReturnValue(workerQueryChain);

    const req = createMockRequest();
    const res = createMockResponse();

    await getDashboardData(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        totals: expect.objectContaining({ total: 5, pending: 3, completed: 2, inProgress: 0 }),
        complaintsByCategory: expect.objectContaining({ electrical: 4, plumbing: 1 }),
        workerWorkload: [
          expect.objectContaining({ workerId: 'worker-1', currentLoad: 2, maxLoad: 5 }),
        ],
      }),
    );
  });
});
