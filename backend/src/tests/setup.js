// Set test environment variables before any module loads
process.env.JWT_SECRET = 'test_secret_key_for_jest_minimum_32_chars';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
