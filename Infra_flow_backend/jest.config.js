export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTestEnv.js'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['controllers/**/*.js', 'services/**/*.js'],
  coverageDirectory: '<rootDir>/coverage',
  verbose: true,
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};
