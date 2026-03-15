import { jest } from '@jest/globals';
import { register, login } from '../../controllers/auth.controller.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as mockModelStubs from '../mocks/modelStubs.js';
import { createMockRequest, createMockResponse } from '../utils/httpMocks.js';

jest.mock('../../models/user.model.js', () => {
  const actual = jest.requireActual('../mocks/modelStubs.js');
  return {
    __esModule: true,
    default: actual.mockUserModel,
  };
});

jest.mock('../../models/worker.model.js', () => {
  const actual = jest.requireActual('../mocks/modelStubs.js');
  return {
    __esModule: true,
    default: actual.mockWorkerModel,
  };
});

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

const { mockUserModel, mockWorkerModel, resetModelStubs } = mockModelStubs;
const mockBcrypt = bcrypt;
const mockJwt = jwt;

describe('Auth Controller', () => {
  beforeEach(() => {
    resetModelStubs();
    mockBcrypt.hash.mockReset();
    mockBcrypt.compare.mockReset();
    mockJwt.sign.mockReset();
  });

  it('registers a new worker and issues a token', async () => {
    mockUserModel.findOne
      .mockResolvedValueOnce(null) // email check
      .mockResolvedValueOnce(null); // mobile number check
    mockBcrypt.hash.mockResolvedValue('hashed-password');
    const createdUser = { _id: 'user123', name: 'Alex', role: 'worker', email: 'alex@campus.edu' };
    mockUserModel.create.mockResolvedValue(createdUser);
    mockWorkerModel.create.mockResolvedValue({ _id: 'worker1' });
    mockJwt.sign.mockReturnValue('signed-jwt');

    const req = createMockRequest({
      body: {
        name: 'Alex',
        mobileNumber: '1234567890',
        department: 'mechanical',
        email: 'alex@campus.edu',
        password: 'password123',
        role: 'worker',
        skills: ['electrical'],
      },
    });
    const res = createMockResponse();

    await register(req, res);

    expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'alex@campus.edu' });
    expect(mockWorkerModel.create).toHaveBeenCalledWith({ user: 'user123', skills: ['electrical'] });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Registration successful',
        accessToken: 'signed-jwt',
        user: expect.objectContaining({ id: 'user123', role: 'worker' }),
      }),
    );
  });

  it('prevents duplicate registration by email', async () => {
    mockUserModel.findOne.mockResolvedValue({ _id: 'existing' });
    const req = createMockRequest({
      body: {
        name: 'Sam',
        email: 'sam@campus.edu',
        password: 'secret123',
        role: 'authority',
      },
    });
    const res = createMockResponse();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email already registered' });
  });

  it('logs in a user with valid credentials', async () => {
    const userRecord = { _id: 'user-7', name: 'Mia', role: 'authority', email: 'mia@campus.edu', passwordHash: 'hash' };
    mockUserModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(userRecord) });
    mockBcrypt.compare.mockResolvedValue(true);
    mockJwt.sign.mockReturnValue('auth-token');

    const req = createMockRequest({ body: { role: 'authority', email: 'mia@campus.edu', password: 'secret' } });
    const res = createMockResponse();

    await login(req, res);

    expect(mockBcrypt.compare).toHaveBeenCalledWith('secret', 'hash');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'auth-token',
        user: expect.objectContaining({ email: 'mia@campus.edu' }),
      }),
    );
  });

  it('rejects invalid credentials', async () => {
    const userRecord = { _id: 'user-9', role: 'authority', email: 'fake@campus.edu', passwordHash: 'hash' };
    mockUserModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(userRecord) });
    mockBcrypt.compare.mockResolvedValue(false);

    const req = createMockRequest({ body: { role: 'authority', email: 'fake@campus.edu', password: 'wrong' } });
    const res = createMockResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
  });
});
