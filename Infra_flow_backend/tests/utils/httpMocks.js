import { jest } from '@jest/globals';

export const createMockRequest = ({ body = {}, params = {}, headers = {}, user = null, query = {} } = {}) => ({
  body,
  params,
  headers,
  user,
  query,
});

export const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
