module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./src/tests/setup.js'],
  forceExit: true,
  clearMocks: true,
};
