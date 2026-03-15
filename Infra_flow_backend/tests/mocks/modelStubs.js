import { jest } from '@jest/globals';

export const mockUserModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
};

export const mockWorkerModel = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  find: jest.fn(),
};

export const mockComplaintModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn(),
};

export const resetModelStubs = () => {
  const collections = [mockUserModel, mockWorkerModel, mockComplaintModel];
  collections.forEach((collection) => {
    Object.values(collection).forEach((maybeFn) => {
      if (typeof maybeFn === 'function' && 'mockReset' in maybeFn) {
        maybeFn.mockReset();
      }
    });
  });
};
