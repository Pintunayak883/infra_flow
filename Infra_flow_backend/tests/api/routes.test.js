import request from 'supertest';
import { jest } from '@jest/globals';
import { createTestApp } from './createTestApp.js';
import * as mockModelStubs from '../mocks/modelStubs.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../../models/user.model.js', () => {
  const actual = jest.requireActual('../mocks/modelStubs.js');
  return {
    __esModule: true,
    default: actual.mockUserModel,
  };
});

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

const { mockUserModel, mockComplaintModel, mockWorkerModel, resetModelStubs } = mockModelStubs;

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
  },
}));

const app = createTestApp();

const buildAuthHeaders = (role = 'student') => ({
  Authorization: 'Bearer test-token',
  'x-test-role': role,
});

describe('API routes', () => {
  beforeEach(() => {
    resetModelStubs();
    bcrypt.hash.mockReset();
    bcrypt.compare.mockReset();
    jwt.sign.mockReset();
    jwt.verify.mockReset();
  });

  it('POST /auth/login returns a JWT payload', async () => {
    const userRecord = { _id: 'usr-1', name: 'Nora', role: 'authority', email: 'nora@campus.edu', passwordHash: 'hash' };
    mockUserModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(userRecord) });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('api-token');

    const response = await request(app)
      .post('/auth/login')
      .send({ role: 'authority', email: 'nora@campus.edu', password: 'secret' })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({ accessToken: 'api-token', user: expect.objectContaining({ email: 'nora@campus.edu' }) }),
    );
  });

  it('POST /complaints/create records a complaint', async () => {
    mockComplaintModel.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockComplaintModel.create.mockResolvedValue({ _id: 'cmp-api' });

    await request(app)
      .post('/complaints/create')
      .set(buildAuthHeaders('student'))
      .send({
        title: 'Loose wire',
        description: 'Dangerous',
        roomNumber: 'E-101',
        category: 'electrical',
        photoUrl: 'data:image/png;base64,test',
      })
      .expect(201);
  });

  it('PUT /complaints/assign-worker assigns worker for admin', async () => {
    const complaint = {
      _id: 'cmp-assign',
      status: 'pending',
      history: [],
      roomNumber: 'A-12',
      category: 'network',
      priority: 'high',
      description: 'Router offline',
      save: jest.fn().mockResolvedValue(true),
      populate: jest.fn().mockResolvedValue({ createdBy: { _id: 'student-5' }, _id: 'cmp-assign' }),
    };
    mockComplaintModel.findById.mockResolvedValue(complaint);

    const worker = {
      _id: 'worker-9',
      user: { name: 'Lee' },
      currentLoad: 1,
      maxLoad: 4,
      assignedComplaints: [],
      save: jest.fn().mockResolvedValue(true),
    };
    mockWorkerModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(worker),
    });

    await request(app)
      .put('/complaints/assign-worker/cmp-assign')
      .set(buildAuthHeaders('admin'))
      .send({ workerId: 'worker-9' })
      .expect(200);
  });

  it('PUT /complaints/update-status/:id advances complaint state', async () => {
    const complaint = {
      _id: 'cmp-status',
      status: 'pending',
      history: [],
      assignedWorker: 'worker-2',
      save: jest.fn(),
      populate: jest.fn().mockResolvedValue({ _id: 'cmp-status', createdBy: { _id: 'student-2' } }),
    };
    mockComplaintModel.findById.mockResolvedValue(complaint);
    mockWorkerModel.findByIdAndUpdate.mockResolvedValue(true);

    await request(app)
      .put('/complaints/update-status/cmp-status')
      .set(buildAuthHeaders('worker'))
      .send({ status: 'completed', note: 'Resolved' })
      .expect(200);
  });

  it('GET /admin/dashboard-data returns analytics payload', async () => {
    mockComplaintModel.aggregate
      .mockResolvedValueOnce([{ _id: 'pending', count: 1 }])
      .mockResolvedValueOnce([{ _id: 'electrical', count: 1 }]);
    const workerChain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'worker-1', user: { name: 'Ana' }, availability: { status: 'online' }, currentLoad: 1, maxLoad: 3 }]),
    };
    mockWorkerModel.find.mockReturnValue(workerChain);

    const response = await request(app)
      .get('/admin/dashboard-data')
      .set(buildAuthHeaders('admin'))
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({ totals: expect.objectContaining({ total: 1 }) }),
    );
  });
});
